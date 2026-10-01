import React from 'react';
import { Solver, Question, ProblemLevel, isCertifiedExpert } from '../types';
import { useApp } from '../context/AppContext';
import { LEVEL_CONFIGS } from '../data/mockData';
import {
  X,
  ShieldCheck,
  Star,
  Award,
  DollarSign,
  TrendingUp,
  MessageSquare,
  ChevronRight,
  ExternalLink,
  ArrowLeft,
  MessageCircle,
  BarChart3,
  FileText,
} from 'lucide-react';

interface SolverProfileModalProps {
  solver: Solver;
  onClose: () => void;
  onPostQuestion: (solver: Solver) => void;
  onOpenChat?: (solver: Solver) => void;
  isFullPage?: boolean;
}

export const SolverProfileModal: React.FC<SolverProfileModalProps> = ({
  solver,
  onClose,
  onPostQuestion,
  onOpenChat,
  isFullPage = false,
}) => {
  const { answers, questions, setSelectedQuestion, startDirectChat } = useApp();

  if (!solver) return null;

  const handleStartChat = () => {
    startDirectChat({
      id: solver.id,
      name: solver.name,
      avatar: solver.avatar,
      title: solver.title,
    });
    if (onOpenChat) {
      onOpenChat(solver);
    }
  };

  const solverAnswers = answers.filter((a) => a.solverId === solver.id);

  const content = (
    <div className={`bg-white rounded-3xl border border-stone-200 shadow-sm w-full ${isFullPage ? 'max-w-3xl mx-auto my-2' : 'max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150'}`}>
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-stone-200 flex items-start justify-between bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3.5">
          {isFullPage && (
            <button
              onClick={onClose}
              className="p-2 -ml-2 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
              title="返回問題市場"
            >
              <ArrowLeft className="w-5 h-5 text-amber-600" />
              <span className="hidden sm:inline">返回問題市場</span>
            </button>
          )}
          <img
            src={solver.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
            alt={solver.name}
            className="w-14 h-14 rounded-2xl object-cover ring-2 ring-amber-400"
          />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-stone-900">{solver.name}</h2>
              {isCertifiedExpert(solver) && (
                <span
                  title="認證專家（通過平台認證，或 採納方案 ≥ 50）"
                  className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600" /> 認證專家
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-stone-600 font-medium">{solver.title}</p>
          </div>
        </div>
        {!isFullPage && (
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Body */}
      <div className={`p-4 sm:p-6 space-y-6 ${!isFullPage ? 'overflow-y-auto' : ''}`}>
          {/* Key Metrics: 公開顯示專業領域、方案採納次數、評分（0~5星），不顯示總賺取賞金 */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
            <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200">
              <span className="text-[10px] text-stone-400 font-bold block">評分口碑</span>
              <div className="flex items-center justify-center gap-1 mt-0.5">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="text-base font-black text-stone-900 font-mono">{solver.rating}</span>
              </div>
              <span className="text-[10px] text-stone-400">({solver.reviewCount} 則評價)</span>
            </div>

            <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200">
              <span className="text-[10px] text-amber-800 font-bold block">方案採納次數</span>
              <div className="text-base font-black text-amber-900 font-mono mt-0.5">
                {Math.round(solver.answerCount * (solver.acceptedRate / 100)) || solver.answerCount} 次
              </div>
              <span className="text-[10px] text-amber-700">實戰被採納</span>
            </div>

            <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200">
              <span className="text-[10px] text-stone-400 font-bold block">專業主領域</span>
              <div className="text-sm font-black text-stone-900 truncate mt-0.5">
                {solver.domain}
              </div>
              <span className="text-[10px] text-stone-400">
                {solver.subcategory || '全領域實戰'}
              </span>
            </div>
          </div>

          {/* 解答各等級問題數分佈 (L0 ~ L4) */}
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-600" />
                <h4 className="text-xs font-bold text-stone-900">解答各等級問題數統計（L0 ~ L4）</h4>
              </div>
              <span className="text-[11px] font-mono text-stone-500 font-bold">
                總累積解答 {solver.answerCount} 題
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2 text-center">
              {(['L0', 'L1', 'L2', 'L3', 'L4'] as ProblemLevel[]).map((lvl) => {
                const cfg = LEVEL_CONFIGS[lvl];
                const count = (solver.levelAnswerCounts && solver.levelAnswerCounts[lvl] !== undefined)
                  ? solver.levelAnswerCounts[lvl]
                  : lvl === 'L0'
                  ? Math.max(1, Math.round(solver.answerCount * 0.15))
                  : lvl === 'L1'
                  ? Math.max(2, Math.round(solver.answerCount * 0.35))
                  : lvl === 'L2'
                  ? Math.max(2, Math.round(solver.answerCount * 0.28))
                  : lvl === 'L3'
                  ? Math.max(1, Math.round(solver.answerCount * 0.16))
                  : Math.max(1, Math.round(solver.answerCount * 0.06));

                return (
                  <div
                    key={lvl}
                    className={`p-2 sm:p-2.5 rounded-xl border ${
                      lvl === 'L4'
                        ? 'bg-amber-500/10 border-amber-300'
                        : lvl === 'L3'
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-white border-stone-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-bold text-stone-400">
                      <span>{lvl}</span>
                    </div>
                    <div className="text-base sm:text-lg font-black text-stone-900 font-mono mt-0.5">
                      {count}
                    </div>
                    <span className="text-[9px] text-stone-500 block truncate">{cfg.name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* About / Bio */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider">個人簡介與專業背景</h4>
            <p className="text-xs sm:text-sm text-stone-700 leading-relaxed bg-stone-50 p-4 rounded-2xl border border-stone-100">
              {solver.bio}
            </p>
          </div>

          {/* Skills & Categories */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider">核心領域與精通技能</h4>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-xl bg-stone-900 text-white font-bold text-xs">
                {solver.domain}
              </span>
              {solver.subcategory && (
                <span className="px-3 py-1 rounded-xl bg-amber-500 text-stone-950 font-black text-xs shadow-2xs">
                  {solver.subcategory}
                </span>
              )}
              {solver.skills.map((skill) => (
                <span
                  key={skill}
                  className="px-3 py-1 rounded-xl bg-amber-50 text-amber-900 font-semibold text-xs border border-amber-200"
                >
                  #{skill.replace(/^#/, '')}
                </span>
              ))}
            </div>
          </div>

          {/* Featured Case */}
          {solver.featuredCase && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider">精選實際案例</h4>
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-50/60 to-yellow-50/40 border border-amber-200/80 space-y-2.5 shadow-2xs">
                <div className="font-extrabold text-sm sm:text-base text-stone-900">
                  {solver.featuredCase.title}
                </div>
                {solver.featuredCase.description && (
                  <p className="text-xs text-stone-600 leading-relaxed">
                    {solver.featuredCase.description}
                  </p>
                )}
                {solver.featuredCase.outcome && (
                  <div className="pt-1 text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>實務成果：{solver.featuredCase.outcome}</span>
                  </div>
                )}

                {/* 成果截圖與圖表 (至多 5 張) */}
                {solver.featuredCase.images && solver.featuredCase.images.length > 0 && (
                  <div className="pt-2 space-y-1.5">
                    <span className="text-[11px] font-bold text-stone-700 block">📸 成果圖表與實務截圖 ({solver.featuredCase.images.length}/5)</span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {solver.featuredCase.images.map((img, idx) => (
                        <div key={idx} className="group relative rounded-xl overflow-hidden border border-amber-200 bg-stone-100 aspect-video shadow-2xs">
                          {img.url ? (
                            <img src={img.url} alt={img.caption || `成果圖 ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-stone-100 text-stone-400 text-xs">無圖片</div>
                          )}
                          {img.caption && (
                            <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[10px] text-white px-1.5 py-0.5 truncate">
                              {img.caption}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 實務附件檔案 (至多 3 份) */}
                {solver.featuredCase.files && solver.featuredCase.files.length > 0 && (
                  <div className="pt-2 space-y-1.5">
                    <span className="text-[11px] font-bold text-stone-700 block">📎 實務成果附件 ({solver.featuredCase.files.length}/3)</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {solver.featuredCase.files.map((file, idx) => (
                        <div key={idx} className="p-2.5 rounded-xl bg-white border border-amber-200/90 flex items-center justify-between gap-2 shadow-2xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                            <span className="text-xs font-bold text-stone-800 truncate">{file.name}</span>
                          </div>
                          {file.size && <span className="text-[10px] text-stone-400 font-mono shrink-0">{file.size}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recent Solutions Provided (無 > 箭頭) */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider">
              近期發表的解決方案（{solverAnswers.length} 篇）
            </h4>
            <div className="space-y-2">
              {solverAnswers.map((ans) => {
                const relatedQ = questions.find((q) => q.id === ans.questionId);
                return (
                  <div
                    key={ans.id}
                    onClick={() => {
                      if (relatedQ) {
                        setSelectedQuestion(relatedQ);
                        onClose();
                      }
                    }}
                    className="p-3.5 rounded-xl border border-stone-200 hover:border-amber-400 bg-white hover:bg-amber-50/30 transition-all cursor-pointer"
                  >
                    <div className="text-xs font-bold text-stone-900 line-clamp-1">
                      {relatedQ?.title || '懸賞問題方案'}
                    </div>
                    <div className="text-[11px] text-stone-500 mt-0.5 line-clamp-1">
                      交付類別：{ans.deliveryType} • {ans.isPaid ? `付費方案 NT$ ${ans.price}` : '免費公開'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between sticky bottom-0">
          <span className="text-xs text-stone-500 hidden sm:inline">
            可私聊溝通或直接向 {solver.name} 提出專屬定向問題。
          </span>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap sm:flex-nowrap">
            <button
              onClick={handleStartChat}
              className="px-4 py-2.5 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-800 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <MessageCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>私聊諮詢</span>
            </button>
            <button
              onClick={() => onPostQuestion(solver)}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>指定向此專家提問</span>
            </button>
          </div>
        </div>
      </div>
  );

  if (isFullPage) {
    return <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{content}</div>;
  }

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {content}
    </div>
  );
};

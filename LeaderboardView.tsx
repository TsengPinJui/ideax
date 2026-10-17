import React, { useState } from 'react';
import { Solver, Question, ProblemLevel, isCertifiedExpert } from '../types';
import { useApp } from '../context/AppContext';
import { LEVEL_CONFIGS } from '../data/mockData';
import {
  Trophy,
  Award,
  Star,
  BarChart3,
  Users,
  Coins,
  ArrowRight,
  MessageCircle,
  MessageSquare,
  Flame,
  CheckCircle2,
  TrendingUp,
  Clock,
  ShieldCheck,
  Plus,
} from 'lucide-react';

interface LeaderboardViewProps {
  onSelectSolver?: (solver: Solver) => void;
  onSelectQuestion?: (questionId: string) => void;
  onOpenChatWithUser?: (user: { id: string; name: string; avatar: string; title: string }) => void;
  onNavigateToSolvers?: () => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  onSelectSolver,
  onSelectQuestion,
  onOpenChatWithUser,
  onNavigateToSolvers,
}) => {
  const { solvers, availableUsers, questions, answers, startDirectChat, isDemoMode } = useApp();

  const [activeTab, setActiveTab] = useState<'solvers' | 'questioners' | 'weekly_discussions' | 'weekly_solutions' | 'analytics' | 'pain_point_tips'>('solvers');

  const handleStartChat = (e: React.MouseEvent, target: { id: string; name: string; avatar: string; title: string }) => {
    e.stopPropagation();
    startDirectChat(target);
    if (onOpenChatWithUser) {
      onOpenChatWithUser(target);
    }
  };

  const handleSolverClick = (solverId: string) => {
    const s = solvers.find((sol) => sol.id === solverId);
    if (s && onSelectSolver) {
      onSelectSolver(s);
    }
  };

  const handleQuestionClick = (questionId: string) => {
    if (onSelectQuestion) {
      onSelectQuestion(questionId);
    }
  };

  // 1. 頂尖解答者榜 (Top Solvers)
  const topSolvers = solvers
    .map((s) => {
      const acceptedCount = Math.round(s.answerCount * (s.acceptedRate / 100)) || s.answerCount;
      const levelCounts = s.levelAnswerCounts || {
        L0: Math.floor(s.answerCount * 0.15),
        L1: Math.floor(s.answerCount * 0.25),
        L2: Math.floor(s.answerCount * 0.35),
        L3: Math.floor(s.answerCount * 0.18),
        L4: Math.max(1, Math.floor(s.answerCount * 0.07)),
      };
      const score = Math.round(acceptedCount * 120 + s.rating * 200 + (s.earnings / 100));

      return {
        userId: s.id,
        name: s.name,
        avatar: s.avatar,
        title: s.title,
        score,
        primaryStatLabel: '方案採納次數',
        primaryStatValue: `${acceptedCount} 次`,
        secondaryStatLabel: '評分口碑',
        secondaryStatValue: `${s.rating} ★ (${s.reviewCount}則)`,
        levelCounts,
        domain: s.domain,
        verifiedExpert: isCertifiedExpert(s),
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

  // 2. 卓越提問委託人榜 (Top Questioners)
  const topQuestioners = [
    {
      userId: 'user-author-12',
      name: '沈維新 創辦人',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      title: '高科技循環材料集團 CEO',
      score: 98000,
      primaryStatLabel: '懸賞交易額',
      primaryStatValue: '128,000 點',
      secondaryStatLabel: '採納成交率',
      secondaryStatValue: '100% (4/4)',
      levelCounts: { L0: 1, L1: 1, L2: 2, L3: 3, L4: 2 } as Record<ProblemLevel, number>,
      domain: '創新創業',
    },
    {
      userId: 'user-questioner',
      name: '林書豪',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      title: '校園生活創新社群發起人 & 連續創業者',
      score: 36500,
      primaryStatLabel: '懸賞交易額',
      primaryStatValue: '38,600 點',
      secondaryStatLabel: '採納成交率',
      secondaryStatValue: '85% (11/13)',
      levelCounts: { L0: 4, L1: 5, L2: 6, L3: 2, L4: 1 } as Record<ProblemLevel, number>,
      domain: '創新創業',
    },
    {
      userId: 'user-auth-mfg',
      name: '張董事長',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      title: '中部工業機械精密組裝廠負責人',
      score: 29000,
      primaryStatLabel: '懸賞交易額',
      primaryStatValue: '31,500 點',
      secondaryStatLabel: '採納成交率',
      secondaryStatValue: '92% (8/9)',
      levelCounts: { L0: 1, L1: 2, L2: 4, L3: 3, L4: 1 } as Record<ProblemLevel, number>,
      domain: '專業問題',
    },
    {
      userId: 'user-med',
      name: '郭博翔 醫師',
      avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80',
      title: '台北聯合醫學中心微創外科研究員',
      score: 18400,
      primaryStatLabel: '懸賞交易額',
      primaryStatValue: '19,200 點',
      secondaryStatLabel: '採納成交率',
      secondaryStatValue: '88% (6/7)',
      levelCounts: { L0: 2, L1: 3, L2: 3, L3: 2, L4: 0 } as Record<ProblemLevel, number>,
      domain: '學術探討',
    },
    {
      userId: 'user-retail',
      name: '王小芬',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
      title: '連鎖餐飲生活選物品牌營運長',
      score: 12500,
      primaryStatLabel: '懸賞交易額',
      primaryStatValue: '14,000 點',
      secondaryStatLabel: '採納成交率',
      secondaryStatValue: '80% (4/5)',
      levelCounts: { L0: 3, L1: 4, L2: 2, L3: 1, L4: 0 } as Record<ProblemLevel, number>,
      domain: '日常疑難',
    },
  ].map((entry, idx) => ({ ...entry, rank: idx + 1 }));

  // 3. 本週熱門問題討論榜 (Top 10 Discussions) - 嚴格過濾已被下架之題目
  const topDiscussionQuestions = [...questions]
    .filter((q) => q.status !== 'delisted')
    .map((q) => {
      const qAnswers = answers.filter((a) => a.questionId === q.id);
      const discCount = qAnswers.filter((a) => a.type === 'discussion').length;
      const totalAnswers = qAnswers.length || q.answersCount || 0;
      const discussionScore = discCount * 10 + (q.views || 0) * 0.2 + totalAnswers * 5;
      return {
        ...q,
        discussionCount: discCount,
        totalAnswers,
        discussionScore,
      };
    })
    .sort((a, b) => b.discussionScore - a.discussionScore)
    .slice(0, 10)
    .map((item, index) => ({ ...item, rank: index + 1 }));

  // 4. 本週熱門方案榜 (Top 10 Solutions) - 嚴格過濾已被下架之題目
  const topSolutionQuestions = [...questions]
    .filter((q) => q.status !== 'delisted')
    .map((q) => {
      const qAnswers = answers.filter((a) => a.questionId === q.id);
      const solCount = qAnswers.filter((a) => a.type === 'solution').length;
      const hasAccepted = qAnswers.some((a) => a.isAccepted) || q.status === 'solved';
      const solutionScore = solCount * 25 + (q.bounty || 0) * 0.1 + (hasAccepted ? 100 : 0);
      return {
        ...q,
        solutionCount: solCount,
        hasAccepted,
        solutionScore,
      };
    })
    .sort((a, b) => b.solutionScore - a.solutionScore)
    .slice(0, 10)
    .map((item, index) => ({ ...item, rank: index + 1 }));

  // 5. 痛點打賞榜 (Top Users Earned Pain Point Tips)
  const topPainPointTipsCreators = React.useMemo(() => {
    const userTipsMap = new Map<string, {
      userId: string;
      name: string;
      avatar: string;
      title: string;
      totalTips: number;
      painPointCount: number;
      topPainPointTitle: string;
    }>();

    const mockTippedCreators = [
      {
        userId: 'creator-1',
        name: '張家豪',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        title: '資深工業設計師 & 洞察創作者',
        totalTips: 18500,
        painPointCount: 6,
        topPainPointTitle: '傳統工廠機台備料排隊與人工抄表高錯率痛點',
      },
      {
        userId: 'creator-2',
        name: '陳怡君 醫師',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
        title: '臺北聯合醫院門診主治醫師',
        totalTips: 12800,
        painPointCount: 4,
        topPainPointTitle: '診所跨科別紙本病歷同步與藥物交互作用提醒痛點',
      },
      {
        userId: 'creator-3',
        name: '許哲銘',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        title: '微型餐飲連鎖營運顧問',
        totalTips: 9600,
        painPointCount: 5,
        topPainPointTitle: '早餐店晨間尖峰備料損耗與POS系統離線卡單痛點',
      },
      {
        userId: 'creator-4',
        name: '廖美玲',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
        title: '社區物流與最後一哩路配送負責人',
        totalTips: 7200,
        painPointCount: 3,
        topPainPointTitle: '高樓層無電梯住宅冷鏈快遞退件率高痛點',
      },
    ];

    mockTippedCreators.forEach((mc) => {
      userTipsMap.set(mc.userId, { ...mc });
    });

    questions.forEach((q) => {
      const tips = q.supportPoints || 0;
      if (tips > 0 || q.postType === 'pain_point') {
        const uId = q.authorId || 'user-unknown';
        const existing = userTipsMap.get(uId);
        const name = q.authorName || '創作者';
        const avatar = q.authorAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';
        const title = q.authorTitle || '痛點洞察發起人';

        if (existing) {
          existing.totalTips += tips;
          existing.painPointCount += 1;
          if (tips > 0 && !existing.topPainPointTitle) {
            existing.topPainPointTitle = q.title;
          }
        } else if (tips > 0) {
          userTipsMap.set(uId, {
            userId: uId,
            name,
            avatar,
            title,
            totalTips: tips,
            painPointCount: 1,
            topPainPointTitle: q.title,
          });
        }
      }
    });

    return Array.from(userTipsMap.values())
      .sort((a, b) => b.totalTips - a.totalTips)
      .map((entry, idx) => ({ ...entry, rank: idx + 1 }));
  }, [questions]);

  // 熱門獲賞痛點作品榜
  const topTippedPainPoints = React.useMemo(() => {
    return questions
      .filter((q) => q.postType === 'pain_point' || (q.supportPoints || 0) > 0)
      .sort((a, b) => (b.supportPoints || 0) - (a.supportPoints || 0))
      .slice(0, 10)
      .map((q, idx) => ({ ...q, rank: idx + 1 }));
  }, [questions]);

  // 全站各等級問題分佈統計
  const levelCountsOverall: Record<ProblemLevel, number> = {
    L0: questions.filter((q) => q.level === 'L0').length + (isDemoMode ? 18 : 0),
    L1: questions.filter((q) => q.level === 'L1').length + (isDemoMode ? 32 : 0),
    L2: questions.filter((q) => q.level === 'L2').length + (isDemoMode ? 45 : 0),
    L3: questions.filter((q) => q.level === 'L3').length + (isDemoMode ? 22 : 0),
    L4: questions.filter((q) => q.level === 'L4').length + (isDemoMode ? 9 : 0),
  };
  const totalQuestions = Object.values(levelCountsOverall).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white border border-stone-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-2xl font-black text-stone-900 tracking-tight flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <span>榮譽排行榜</span>
            </h2>
            <p className="mt-0.5 text-stone-500 text-xs">
              解題實績、懸賞活躍度與本週熱門問題（每週一 00:00 結算）
            </p>
          </div>
          {onNavigateToSolvers && (
            <button
              type="button"
              onClick={onNavigateToSolvers}
              className="px-3.5 py-1.5 rounded-full bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-800 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>專家智庫</span>
              <ArrowRight className="w-3 h-3 text-stone-400" />
            </button>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="pt-3 border-t border-stone-100 flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          <button
            onClick={() => setActiveTab('solvers')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'solvers'
                ? 'bg-stone-900 text-white shadow-2xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>解答者榜</span>
          </button>

          <button
            onClick={() => setActiveTab('questioners')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'questioners'
                ? 'bg-stone-900 text-white shadow-2xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-amber-500" />
            <span>提問者榜</span>
          </button>

          <button
            onClick={() => setActiveTab('weekly_discussions')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'weekly_discussions'
                ? 'bg-stone-900 text-white shadow-2xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
            <span>熱門討論</span>
          </button>

          <button
            onClick={() => setActiveTab('weekly_solutions')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'weekly_solutions'
                ? 'bg-stone-900 text-white shadow-2xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>熱門方案</span>
          </button>

          <button
            onClick={() => setActiveTab('pain_point_tips')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'pain_point_tips'
                ? 'bg-amber-500 text-stone-950 font-black shadow-2xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Coins className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>痛點打賞</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'analytics'
                ? 'bg-stone-900 text-white shadow-2xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-stone-500" />
            <span>等級分佈</span>
          </button>
        </div>
      </div>

      {/* TAB 1: 頂尖解答者榜 */}
      {activeTab === 'solvers' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs sm:text-sm font-bold text-stone-700">
              依方案採納數、評價與難度權重綜合排序
            </h3>
            <span className="text-[11px] text-stone-400">公開數據</span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {topSolvers.map((entry) => {
              const solverObj = solvers.find((s) => s.id === entry.userId);
              const rankColor =
                entry.rank === 1
                  ? 'bg-amber-500 text-stone-950 ring-2 ring-amber-300 font-black'
                  : entry.rank === 2
                  ? 'bg-slate-300 text-stone-900 font-bold'
                  : entry.rank === 3
                  ? 'bg-amber-700 text-white font-bold'
                  : 'bg-stone-100 text-stone-600';

              return (
                <div
                  key={entry.userId}
                  onClick={() => handleSolverClick(entry.userId)}
                  className="bg-white rounded-2xl border border-stone-200 hover:border-amber-400 p-4 sm:p-5 transition-all duration-150 hover:shadow-xs cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                >
                  {/* Left info */}
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm shrink-0 ${rankColor}`}
                    >
                      {entry.rank <= 3 ? `★${entry.rank}` : entry.rank}
                    </div>

                    <img
                      src={entry.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                      alt={entry.name}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSolverClick(entry.userId);
                      }}
                      className="w-12 h-12 rounded-2xl object-cover ring-2 ring-stone-200 group-hover:ring-amber-400 hover:scale-105 transition-all cursor-pointer shadow-2xs"
                      title={`點擊查看 ${entry.name} 專家個人檔案`}
                    />

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-black text-base text-stone-900 group-hover:text-amber-600 transition-colors">
                          {entry.name}
                        </h4>
                        {entry.verifiedExpert && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
                            認證專家
                          </span>
                        )}
                        <span className="text-[10px] text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
                          #{entry.domain}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 line-clamp-1">{entry.title}</p>

                      <div className="flex items-center gap-3 text-xs text-stone-600">
                        <span className="font-bold text-amber-700 flex items-center gap-1 font-mono">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          {entry.secondaryStatValue}
                        </span>
                        <span className="text-stone-300">•</span>
                        <span className="font-semibold text-emerald-800">
                          {entry.primaryStatLabel}：<strong className="font-mono">{entry.primaryStatValue}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Middle: 解答的各等級問題數 (L0 ~ L4) 分佈 */}
                  <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-100 shrink-0 md:w-64">
                    <div className="flex items-center justify-between text-[11px] font-bold text-stone-600 mb-1">
                      <span>解答各等級難度分佈</span>
                      <span className="font-mono text-stone-400 text-[10px]">
                        共 {Object.values(entry.levelCounts).reduce((a, b) => a + b, 0)} 題
                      </span>
                    </div>

                    <div className="grid grid-cols-5 gap-1 text-center font-mono">
                      {(['L0', 'L1', 'L2', 'L3', 'L4'] as ProblemLevel[]).map((lvl) => {
                        const count = entry.levelCounts[lvl] || 0;
                        return (
                          <div
                            key={lvl}
                            className={`p-1 rounded-lg border text-[10px] ${
                              lvl === 'L4'
                                ? 'bg-amber-500/20 border-amber-400 text-amber-950 font-bold'
                                : 'bg-white border-stone-200 text-stone-700'
                            }`}
                          >
                            <span className="block font-bold text-[9px] text-stone-400">{lvl}</span>
                            <span className="block font-bold">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <button
                      type="button"
                      onClick={(e) =>
                        handleStartChat(e, {
                          id: entry.userId,
                          name: entry.name,
                          avatar: entry.avatar,
                          title: entry.title,
                        })
                      }
                      className="px-3 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-800 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-amber-600" />
                      <span>私聊</span>
                    </button>
                    {solverObj && onSelectSolver && (
                      <button
                        type="button"
                        onClick={() => onSelectSolver(solverObj)}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <span>專家檔案</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: 卓越提問者榜 */}
      {activeTab === 'questioners' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-stone-900 flex items-center gap-2">
              <span>卓越提問委託人榜單</span>
              <span className="text-xs font-normal text-stone-500">（依委託交易金額、方案採納率與信譽評級排序）</span>
            </h3>
            <span className="text-xs text-stone-400 font-mono">公開數據</span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {topQuestioners.map((entry) => {
              const rankColor =
                entry.rank === 1
                  ? 'bg-amber-500 text-stone-950 ring-2 ring-amber-300 font-black'
                  : entry.rank === 2
                  ? 'bg-slate-300 text-stone-900 font-bold'
                  : entry.rank === 3
                  ? 'bg-amber-700 text-white font-bold'
                  : 'bg-stone-100 text-stone-600';

              return (
                <div
                  key={entry.userId}
                  className="bg-white rounded-2xl border border-stone-200 hover:border-amber-400 p-4 sm:p-5 transition-all duration-150 hover:shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                >
                  {/* Left info */}
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm shrink-0 ${rankColor}`}
                    >
                      {entry.rank <= 3 ? `★${entry.rank}` : entry.rank}
                    </div>

                    <img
                      src={entry.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                      alt={entry.name}
                      onClick={(e) => {
                        e.stopPropagation();
                        const found = solvers.find((s) => s.id === entry.userId) || availableUsers.find((u) => u.id === entry.userId);
                        if (found && onSelectSolver) {
                          onSelectSolver(found as any);
                        } else {
                          handleStartChat(e, {
                            id: entry.userId,
                            name: entry.name,
                            avatar: entry.avatar,
                            title: entry.title,
                          });
                        }
                      }}
                      className="w-12 h-12 rounded-2xl object-cover ring-2 ring-stone-200 group-hover:ring-amber-400 hover:scale-105 transition-all cursor-pointer shadow-2xs"
                      title={`點擊查看 ${entry.name} 個人檔案 / 交流`}
                    />

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-black text-base text-stone-900">{entry.name}</h4>
                        <span className="text-[10px] text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
                          #{entry.domain}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 line-clamp-1">{entry.title}</p>

                      <div className="flex items-center gap-3 text-xs text-stone-600">
                        <span className="font-bold text-amber-900 font-mono">
                          {entry.primaryStatLabel}：{entry.primaryStatValue}
                        </span>
                        <span className="text-stone-300">•</span>
                        <span className="font-semibold text-emerald-800">
                          {entry.secondaryStatLabel}：{entry.secondaryStatValue}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Middle: 提問各等級問題數分佈 (L0~L4) */}
                  <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-100 shrink-0 md:w-64">
                    <div className="flex items-center justify-between text-[11px] font-bold text-stone-600 mb-1">
                      <span>發布各等級難度分佈</span>
                      <span className="font-mono text-stone-400 text-[10px]">
                        共 {Object.values(entry.levelCounts).reduce((a, b) => a + b, 0)} 題
                      </span>
                    </div>

                    <div className="grid grid-cols-5 gap-1 text-center font-mono">
                      {(['L0', 'L1', 'L2', 'L3', 'L4'] as ProblemLevel[]).map((lvl) => {
                        const count = entry.levelCounts[lvl] || 0;
                        return (
                          <div
                            key={lvl}
                            className={`p-1 rounded-lg border text-[10px] ${
                              lvl === 'L4'
                                ? 'bg-amber-500/20 border-amber-400 text-amber-950 font-bold'
                                : 'bg-white border-stone-200 text-stone-700'
                            }`}
                          >
                            <span className="block font-bold text-[9px] text-stone-400">{lvl}</span>
                            <span className="block font-bold">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <button
                      type="button"
                      onClick={(e) =>
                        handleStartChat(e, {
                          id: entry.userId,
                          name: entry.name,
                          avatar: entry.avatar,
                          title: entry.title,
                        })
                      }
                      className="px-3.5 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-800 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-amber-600" />
                      <span>交流私聊</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: 本週熱門問題討論榜 */}
      {activeTab === 'weekly_discussions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-stone-900 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              <span>本週熱門問題討論榜 Top 10</span>
              <span className="text-xs font-normal text-stone-500">（依社群留言交流熱度與瀏覽互動排序）</span>
            </h3>
            <span className="text-xs text-stone-400 font-mono">每週一 00:00 結算</span>
          </div>

          <div className="space-y-3">
            {topDiscussionQuestions.map((q) => (
              <div
                key={q.id}
                onClick={() => handleQuestionClick(q.id)}
                className="p-4 rounded-2xl bg-white border border-stone-200 hover:border-amber-400 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:shadow-xs"
              >
                <div className="flex items-start sm:items-center gap-3.5">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs shrink-0 ${
                      q.rank <= 3 ? 'bg-blue-600 text-white font-black' : 'bg-stone-100 text-stone-700 font-bold'
                    }`}
                  >
                    #{q.rank}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                        {q.category}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-100 text-stone-700">
                        {q.level}
                      </span>
                      {q.postType === 'pain_point' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200">
                          痛點發想
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-sm text-stone-900 group-hover:text-amber-600 transition-colors mt-1">
                      {q.title}
                    </h4>
                    <p className="text-xs text-stone-500 line-clamp-1 mt-0.5">{q.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono shrink-0 self-end sm:self-center">
                  <div className="text-right">
                    <span className="text-[10px] text-stone-400 block">交流討論</span>
                    <span className="font-bold text-blue-700">{q.discussionCount} 則</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-stone-400 block">懸賞金額</span>
                    <span className="font-bold text-amber-900">{(q.bounty || 0) === 0 ? '痛點' : `NT$ ${(q.bounty || 0).toLocaleString()}`}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: 本週熱門方案榜 */}
      {activeTab === 'weekly_solutions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-stone-900 flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-600" />
              <span>本週熱門方案榜 Top 10</span>
              <span className="text-xs font-normal text-stone-500">（依專家方案提交數、方案解鎖與成交狀況排序）</span>
            </h3>
            <span className="text-xs text-stone-400 font-mono">每週一 00:00 結算</span>
          </div>

          <div className="space-y-3">
            {topSolutionQuestions.map((q) => (
              <div
                key={q.id}
                onClick={() => handleQuestionClick(q.id)}
                className="p-4 rounded-2xl bg-white border border-stone-200 hover:border-amber-400 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:shadow-xs"
              >
                <div className="flex items-start sm:items-center gap-3.5">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs shrink-0 ${
                      q.rank <= 3 ? 'bg-amber-500 text-stone-950 font-black' : 'bg-stone-100 text-stone-700 font-bold'
                    }`}
                  >
                    #{q.rank}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">
                        {q.category}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-100 text-stone-700">
                        {q.level}
                      </span>
                      {q.hasAccepted && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-0.5">
                          <CheckCircle2 className="w-2.5 h-2.5" /> 已採納方案
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-sm text-stone-900 group-hover:text-amber-600 transition-colors mt-1">
                      {q.title}
                    </h4>
                    <p className="text-xs text-stone-500 line-clamp-1 mt-0.5">{q.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono shrink-0 self-end sm:self-center">
                  <div className="text-right">
                    <span className="text-[10px] text-stone-400 block">專家方案</span>
                    <span className="font-bold text-amber-700">{q.solutionCount} 份</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-stone-400 block">懸賞金額</span>
                    <span className="font-bold text-amber-900">{(q.bounty || 0) === 0 ? '痛點' : `NT$ ${(q.bounty || 0).toLocaleString()}`}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: 各等級問題分佈分析 (L0 ~ L4) */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {(['L0', 'L1', 'L2', 'L3', 'L4'] as ProblemLevel[]).map((lvl) => {
              const cfg = LEVEL_CONFIGS[lvl];
              const count = levelCountsOverall[lvl];
              const percent = Math.round((count / Math.max(1, totalQuestions)) * 100);

              return (
                <div key={lvl} className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-stone-900 text-sm">{lvl}</span>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      {cfg.name}
                    </span>
                  </div>
                  <div className="text-2xl font-black text-stone-900 font-mono">
                    {count} <span className="text-xs text-stone-400 font-normal">題</span>
                  </div>
                  <div className="text-[10px] text-stone-500 line-clamp-1">
                    {cfg.rangeText}
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        lvl === 'L4' ? 'bg-amber-600' : lvl === 'L3' ? 'bg-amber-500' : 'bg-stone-600'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-stone-400 font-mono block text-right">
                    佔全站 {percent}%
                  </span>
                </div>
              );
            })}
          </div>

          {/* 第三方支付拆款與痛點免費提出規則卡 */}
          <div className="p-5 rounded-3xl bg-amber-50/70 border border-amber-300 space-y-3">
            <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
              <Coins className="w-4 h-4 text-amber-600" />
              <span>IdeaX 平台第三方交易與拆分撥款規則</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-stone-700">
              <div className="p-3 bg-white rounded-xl border border-amber-200">
                <span className="font-black text-amber-950 block mb-1">1. 痛點提出與解鎖機制</span>
                <p className="text-[11px] leading-relaxed text-stone-600">
                  痛點可發布生活與產業難題；各領域人才可提供專屬落地方案並自訂解鎖金額，需付解答者所設金額解鎖。
                </p>
              </div>

              <div className="p-3 bg-white rounded-xl border border-amber-200">
                <span className="font-black text-amber-950 block mb-1">2. 第三方支付安全託管</span>
                <p className="text-[11px] leading-relaxed text-stone-600">
                  買方付款透過第三方支付（信用卡/LINE Pay/ATM 轉帳）安全獨立託管，保障履約與價金安全。
                </p>
              </div>

              <div className="p-3 bg-white rounded-xl border border-amber-200">
                <span className="font-black text-amber-950 block mb-1">3. 成果驗收放款與商用實施保障</span>
                <p className="text-[11px] leading-relaxed text-stone-600">
                  買方確認成果驗收後放款，即時取得商業落地實施授權與合法履約保障，安心無後顧之憂。
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: 痛點打賞榜 (用戶痛點打賞收益與熱門獲賞痛點) */}
      {activeTab === 'pain_point_tips' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-100/70 border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="space-y-1">
              <h3 className="text-base font-black text-amber-950 flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-600 fill-amber-400 shrink-0" />
                <span>全站打賞榮譽榜</span>
              </h3>
              <p className="text-xs text-amber-900/80">
                展示發表提案、詢問、痛點洞察、VibeCoding 應用或討論，獲得廣大讀者打賞支持總額最高之創作者與熱門作品排行榜
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-amber-800 bg-white/80 px-3 py-1 rounded-xl border border-amber-300 shrink-0 self-start sm:self-auto shadow-2xs">
              每週一 00:00 彙整結算
            </span>
          </div>

          {/* Section 1: 用戶痛點打賞收益榜 Top Rankings */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-extrabold text-stone-900 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span>用戶打賞總收益榜</span>
                <span className="text-xs font-normal text-stone-500">（跨所有提案、詢問、痛點、程式與討論累計計算）</span>
              </h4>
              <span className="text-xs text-stone-400 font-mono">即時數據</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {topPainPointTipsCreators.map((item) => (
                <div
                  key={item.userId}
                  className="p-4 rounded-2xl bg-white border border-stone-200 hover:border-amber-400 transition-all shadow-2xs hover:shadow-md flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <img
                        src={item.avatar}
                        alt={item.name}
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-amber-300/80"
                      />
                      <span
                        className={`absolute -top-1 -left-1 w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center text-white shadow-2xs ${
                          item.rank === 1
                            ? 'bg-amber-500 ring-2 ring-amber-300'
                            : item.rank === 2
                            ? 'bg-slate-400 ring-2 ring-slate-200'
                            : item.rank === 3
                            ? 'bg-amber-700 ring-2 ring-amber-600'
                            : 'bg-stone-700'
                        }`}
                      >
                        {item.rank}
                      </span>
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-stone-900 text-sm group-hover:text-amber-700 transition-colors truncate">
                          {item.name}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200">
                          {item.painPointCount} 篇作品獲賞
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 truncate">{item.title}</p>
                      {item.topPainPointTitle && (
                        <p className="text-[11px] text-stone-400 line-clamp-1 italic">
                          代表作品：《{item.topPainPointTitle}》
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 雙幣符號 + 數字 */}
                  <div className="text-right shrink-0 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-300">
                    <span className="text-[10px] font-bold text-amber-800 block">打賞總額</span>
                    <span className="text-sm font-black text-amber-700 font-mono flex items-center gap-1">
                      <Coins className="w-4 h-4 text-amber-600 fill-amber-400 inline shrink-0" />
                      <span>{item.totalTips.toLocaleString()} 點</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: 熱門獲賞痛點作品 Top 10 */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-extrabold text-stone-900 flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-600 fill-amber-400" />
                <span>熱門獲賞作品與提案 Top 10</span>
                <span className="text-xs font-normal text-stone-500">（依單篇作品/文章獲得讀者打賞支持總額排序）</span>
              </h4>
              <span className="text-xs text-stone-400 font-mono">點擊可查看詳情</span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {topTippedPainPoints.map((q) => (
                <div
                  key={q.id}
                  onClick={() => onSelectQuestion?.(q.id)}
                  className="p-3.5 rounded-2xl bg-white border border-stone-200 hover:border-amber-400 shadow-2xs hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-xl text-xs font-black flex items-center justify-center shrink-0 ${
                        q.rank === 1
                          ? 'bg-amber-500 text-stone-950 font-black shadow-2xs'
                          : q.rank === 2
                          ? 'bg-stone-300 text-stone-900'
                          : q.rank === 3
                          ? 'bg-amber-700 text-white'
                          : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      #{q.rank}
                    </span>

                    <div className="min-w-0 space-y-0.5">
                      <h5 className="font-extrabold text-stone-900 text-xs sm:text-sm group-hover:text-amber-600 transition-colors line-clamp-1">
                        {q.title}
                      </h5>
                      <div className="flex items-center gap-2 text-[11px] text-stone-500 flex-wrap">
                        <span>發布者：{q.authorName || '匿名創作者'}</span>
                        <span>•</span>
                        <span className="text-rose-600 font-medium">
                          {(q.secondedCount || 0)} 人附議共鳴
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 雙幣符號 + 數字 */}
                  <div className="text-right shrink-0 px-3 py-1 rounded-xl bg-amber-100/90 border border-amber-300 flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-amber-600 fill-amber-400 shrink-0" />
                    <span className="text-sm sm:text-base font-black text-amber-800 font-mono">
                      {(q.supportPoints || 0).toLocaleString()} 點
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import {
  User,
  Solver,
  Question,
  Answer,
  Transaction,
  ProblemLevel,
  AchievementBadge,
  HonorTitleInfo,
  LeaderboardEntry,
} from '../types';

/**
 * 榮譽稱號定義清單
 */
export const SOLVER_HONOR_TITLES: HonorTitleInfo[] = [
  {
    role: 'solver',
    level: 1,
    title: '新銳解答者',
    badgeClass: 'bg-stone-100 text-stone-700 border-stone-300',
    icon: '🌱',
    requirementText: '累計方案被採納 ≥ 1 次',
  },
  {
    role: 'solver',
    level: 2,
    title: '實戰資深智囊',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200 font-bold',
    icon: '⚡',
    requirementText: '累計被採納 ≥ 5 次，評分 ≥ 4.7',
  },
  {
    role: 'solver',
    level: 3,
    title: '金牌戰略顧問',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-bold shadow-2xs',
    icon: '🏅',
    requirementText: '累計被採納 ≥ 15 次，解題跨 L2~L4',
  },
  {
    role: 'solver',
    level: 4,
    title: '頂尖領航導師',
    badgeClass: 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-700 font-black shadow-xs',
    icon: '👑',
    requirementText: '累計被採納 ≥ 30 次，包含 L4 重磅解題',
  },
  {
    role: 'solver',
    level: 5,
    title: '殿堂級傳奇國師',
    badgeClass: 'bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500 text-stone-950 border-amber-500 font-black shadow-sm',
    icon: '🏆',
    requirementText: '累計被採納 ≥ 50 次，全領域卓越口碑',
  },
];

export const QUESTIONER_HONOR_TITLES: HonorTitleInfo[] = [
  {
    role: 'questioner',
    level: 1,
    title: '探索發起人',
    badgeClass: 'bg-stone-100 text-stone-700 border-stone-300',
    icon: '🔍',
    requirementText: '發布提問懸賞 ≥ 1 次',
  },
  {
    role: 'questioner',
    level: 2,
    title: '睿智求真者',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200 font-bold',
    icon: '💡',
    requirementText: '完成託管交易 ≥ 3 次，或問題登每週討論榜前10 ≥ 1次',
  },
  {
    role: 'questioner',
    level: 3,
    title: '黃金天使委託人',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-bold shadow-2xs',
    icon: '🌟',
    requirementText: '懸賞交易 ≥ 10 次，問題登每週討論/方案榜前10 ≥ 5次',
  },
  {
    role: 'questioner',
    level: 4,
    title: '尊爵伯樂金主',
    badgeClass: 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-700 font-black shadow-xs',
    icon: '💎',
    requirementText: '完成懸賞交易 ≥ 25 次，每週雙榜前10累計 ≥ 10次',
  },
  {
    role: 'questioner',
    level: 5,
    title: '傳奇創投領袖',
    badgeClass: 'bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500 text-stone-950 border-amber-500 font-black shadow-sm',
    icon: '🚀',
    requirementText: '發布 L4 重磅問題，且多次榮登每週雙榜 Top 3 霸榜',
  },
];

/**
 * 取得解答者的各等級問題解答數量 (L0 ~ L4)
 */
export function getSolverLevelCounts(
  solverId: string,
  answers: Answer[],
  questions: Question[],
  baseCounts?: Record<ProblemLevel, number>
): Record<ProblemLevel, number> {
  const counts: Record<ProblemLevel, number> = baseCounts
    ? { ...baseCounts }
    : { L0: 0, L1: 0, L2: 0, L3: 0, L4: 0 };

  const solverAns = answers.filter((a) => a.solverId === solverId);
  const seenQuestionIds = new Set<string>();

  for (const ans of solverAns) {
    if (seenQuestionIds.has(ans.questionId)) continue;
    seenQuestionIds.add(ans.questionId);

    const q = questions.find((item) => item.id === ans.questionId);
    if (q && q.level) {
      const lvl = q.level as ProblemLevel;
      if (counts[lvl] !== undefined) {
        // Only increment if not already counted from base
        if (!baseCounts) {
          counts[lvl] += 1;
        }
      }
    }
  }

  // Ensure minimum realistic distribution if brand new
  if (Object.values(counts).reduce((a, b) => a + b, 0) === 0) {
    return { L0: 3, L1: 5, L2: 8, L3: 3, L4: 1 };
  }

  return counts;
}

/**
 * 取得提問者的各等級問題發布數量 (L0 ~ L4)
 */
export function getQuestionerLevelCounts(
  userId: string,
  questions: Question[],
  baseCounts?: Record<ProblemLevel, number>
): Record<ProblemLevel, number> {
  const counts: Record<ProblemLevel, number> = baseCounts
    ? { ...baseCounts }
    : { L0: 0, L1: 0, L2: 0, L3: 0, L4: 0 };

  const userQs = questions.filter((q) => q.authorId === userId);
  for (const q of userQs) {
    const lvl = q.level as ProblemLevel;
    if (counts[lvl] !== undefined && !baseCounts) {
      counts[lvl] += 1;
    }
  }

  if (Object.values(counts).reduce((a, b) => a + b, 0) === 0) {
    return { L0: 2, L1: 3, L2: 4, L3: 1, L4: 0 };
  }

  return counts;
}

/**
 * 計算解答者榮譽稱號
 */
export function calculateSolverHonor(
  acceptedCount: number,
  rating: number,
  hasL4: boolean = false
): HonorTitleInfo {
  if (acceptedCount >= 40 && hasL4) return SOLVER_HONOR_TITLES[4];
  if (acceptedCount >= 20 && rating >= 4.8) return SOLVER_HONOR_TITLES[3];
  if (acceptedCount >= 10 && rating >= 4.7) return SOLVER_HONOR_TITLES[2];
  if (acceptedCount >= 4) return SOLVER_HONOR_TITLES[1];
  return SOLVER_HONOR_TITLES[0];
}

/**
 * 計算提問者榮譽稱號
 */
export function calculateQuestionerHonor(
  completedTransactionsCount: number,
  totalWithheldOrSpent: number
): HonorTitleInfo {
  if (completedTransactionsCount >= 25 || totalWithheldOrSpent >= 80000) return QUESTIONER_HONOR_TITLES[4];
  if (completedTransactionsCount >= 15 || totalWithheldOrSpent >= 30000) return QUESTIONER_HONOR_TITLES[3];
  if (completedTransactionsCount >= 8 || totalWithheldOrSpent >= 10000) return QUESTIONER_HONOR_TITLES[2];
  if (completedTransactionsCount >= 3) return QUESTIONER_HONOR_TITLES[1];
  return QUESTIONER_HONOR_TITLES[0];
}

/**
 * 取得用戶成就清單與達成進度
 */
export function getUserAchievements(
  user: User,
  userQuestions: Question[],
  userAnswers: Answer[],
  transactions: Transaction[]
): AchievementBadge[] {
  const acceptedAnswersCount = userAnswers.filter((a) => a.isAccepted).length;
  const questionsCount = userQuestions.length;
  const solvedQuestionsCount = userQuestions.filter((q) => q.status === 'solved').length;
  
  const completedTxs = transactions.filter(
    (t) => (t.fromUserName === user.name || t.toUserName === user.name) && t.status === '已完成'
  );
  const totalVolume = completedTxs.reduce((sum, t) => sum + t.amount, 0);

  // Level counts
  const lvlCounts = user.levelAnswerCounts || { L0: 2, L1: 4, L2: 6, L3: 3, L4: 1 };
  const hasL4Answer = (lvlCounts.L4 || 0) > 0;
  const highLevelAnswersCount = (lvlCounts.L3 || 0) + (lvlCounts.L4 || 0);

  return [
    // 提問類成就
    {
      id: 'ach-q-1',
      title: '破風啟航',
      description: '首次在 IdeaX 發布懸賞問題，勇敢邁出探索第一步',
      category: 'questioner',
      icon: '🚀',
      tier: 'bronze',
      unlocked: questionsCount >= 1,
      progress: Math.min(1, questionsCount),
      maxProgress: 1,
      unlockedAt: questionsCount >= 1 ? '已達成' : undefined,
    },
    {
      id: 'ach-q-top-disc',
      title: '每週熱門討論風雲榜',
      description: '發布之問題榮登全站「每週討論榜前10名」累積達 3 次（每週一結算）',
      category: 'questioner',
      icon: '💬',
      tier: 'silver',
      unlocked: (user.weeklyTop10DiscussionCount || 0) >= 3,
      progress: Math.min(3, user.weeklyTop10DiscussionCount || 0),
      maxProgress: 3,
      unlockedAt: (user.weeklyTop10DiscussionCount || 0) >= 3 ? '已達成' : undefined,
    },
    {
      id: 'ach-q-top-sol',
      title: '每週優質方案策源地',
      description: '發布之問題榮登全站「每週方案榜前10名」累積達 3 次（每週一結算）',
      category: 'questioner',
      icon: '💡',
      tier: 'silver',
      unlocked: (user.weeklyTop10SolutionCount || 0) >= 3,
      progress: Math.min(3, user.weeklyTop10SolutionCount || 0),
      maxProgress: 3,
      unlockedAt: (user.weeklyTop10SolutionCount || 0) >= 3 ? '已達成' : undefined,
    },
    {
      id: 'ach-q-2',
      title: '智慧委託大師',
      description: '累積發布 5 則問題並成功採納最佳專業方案',
      category: 'questioner',
      icon: '🎯',
      tier: 'silver',
      unlocked: solvedQuestionsCount >= 5,
      progress: Math.min(5, solvedQuestionsCount),
      maxProgress: 5,
      unlockedAt: solvedQuestionsCount >= 5 ? '已達成' : undefined,
    },
    {
      id: 'ach-q-top-legend',
      title: '每週雙榜霸榜傳奇',
      description: '發布之問題累計登上每週討論榜或方案榜前10名達 10 次（每週一結算）',
      category: 'questioner',
      icon: '👑',
      tier: 'gold',
      unlocked: ((user.weeklyTop10DiscussionCount || 0) + (user.weeklyTop10SolutionCount || 0)) >= 10,
      progress: Math.min(10, (user.weeklyTop10DiscussionCount || 0) + (user.weeklyTop10SolutionCount || 0)),
      maxProgress: 10,
      unlockedAt: ((user.weeklyTop10DiscussionCount || 0) + (user.weeklyTop10SolutionCount || 0)) >= 10 ? '已達成' : undefined,
    },
    {
      id: 'ach-q-3',
      title: '百萬伯樂金眼',
      description: '累計託管懸賞金額達 10,000 點以上，誠意賦能產業顧問',
      category: 'questioner',
      icon: '💎',
      tier: 'platinum',
      unlocked: totalVolume >= 10000,
      progress: Math.min(10000, totalVolume),
      maxProgress: 10000,
      unlockedAt: totalVolume >= 10000 ? '已達成' : undefined,
    },

    // 解答類成就
    {
      id: 'ach-s-1',
      title: '破局首勝',
      description: '提交之解決方案首次被提問者採納，獲得全額懸賞',
      category: 'solver',
      icon: '⚔️',
      tier: 'bronze',
      unlocked: acceptedAnswersCount >= 1,
      progress: Math.min(1, acceptedAnswersCount),
      maxProgress: 1,
      unlockedAt: acceptedAnswersCount >= 1 ? '已達成' : undefined,
    },
    {
      id: 'ach-s-2',
      title: '五星實戰專家',
      description: '連續獲得提問者 5 次滿分五星好評認可',
      category: 'solver',
      icon: '⭐',
      tier: 'silver',
      unlocked: acceptedAnswersCount >= 5 && (user.rating || 5) >= 4.8,
      progress: Math.min(5, acceptedAnswersCount),
      maxProgress: 5,
      unlockedAt: acceptedAnswersCount >= 5 ? '已達成' : undefined,
    },
    {
      id: 'ach-s-3',
      title: '頂峰高難度征服者',
      description: '成功解開 L3 或 L4 級別之產業核心難題，展現無可取代專業',
      category: 'solver',
      icon: '🏔️',
      tier: 'gold',
      unlocked: highLevelAnswersCount >= 3 || hasL4Answer,
      progress: Math.min(3, highLevelAnswersCount),
      maxProgress: 3,
      unlockedAt: hasL4Answer ? '已達成' : undefined,
    },
    {
      id: 'ach-s-4',
      title: '殿堂級智囊',
      description: '累計方案採納達 20 次以上，成為平台最受信任智庫骨幹',
      category: 'solver',
      icon: '👑',
      tier: 'platinum',
      unlocked: acceptedAnswersCount >= 20,
      progress: Math.min(20, acceptedAnswersCount),
      maxProgress: 20,
      unlockedAt: acceptedAnswersCount >= 20 ? '已達成' : undefined,
    },

    // 交易類成就
    {
      id: 'ach-t-1',
      title: '信譽守護者',
      description: '在安全託管機制下零爭議完成 10 筆以上交易結算',
      category: 'transaction',
      icon: '🛡️',
      tier: 'silver',
      unlocked: completedTxs.length >= 10,
      progress: Math.min(10, completedTxs.length),
      maxProgress: 10,
      unlockedAt: completedTxs.length >= 10 ? '已達成' : undefined,
    },
    {
      id: 'ach-t-2',
      title: '生態推動引擎',
      description: '累計在 IdeaX 交易成交量突破 50,000 點',
      category: 'transaction',
      icon: '🔥',
      tier: 'platinum',
      unlocked: totalVolume >= 50000,
      progress: Math.min(50000, totalVolume),
      maxProgress: 50000,
      unlockedAt: totalVolume >= 50000 ? '已達成' : undefined,
    },
  ];
}

/**
 * 產生排行榜數據（頂尖解答者榜、卓越提問者榜、成交風雲榜）
 */
export function generateLeaderboards(
  solvers: Solver[],
  users: User[],
  questions: Question[],
  answers: Answer[]
): {
  topSolvers: LeaderboardEntry[];
  topQuestioners: LeaderboardEntry[];
  hotTrades: LeaderboardEntry[];
} {
  // 1. 頂尖解答者榜 (Top Solvers)
  const topSolvers: LeaderboardEntry[] = solvers
    .map((s, index) => {
      const acceptedCount = Math.round(s.answerCount * (s.acceptedRate / 100)) || s.answerCount;
      const levelCounts = s.levelAnswerCounts || {
        L0: Math.floor(s.answerCount * 0.15),
        L1: Math.floor(s.answerCount * 0.25),
        L2: Math.floor(s.answerCount * 0.35),
        L3: Math.floor(s.answerCount * 0.18),
        L4: Math.max(1, Math.floor(s.answerCount * 0.07)),
      };

      const honor = calculateSolverHonor(acceptedCount, s.rating, (levelCounts.L4 || 0) > 0);
      const score = Math.round(acceptedCount * 120 + s.rating * 200 + (s.earnings / 100));

      return {
        rank: index + 1,
        userId: s.id,
        name: s.name,
        avatar: s.avatar,
        title: s.title,
        role: 'solver' as const,
        honorTitle: s.honorTitle || honor.title,
        score,
        primaryStatLabel: '採納方案數',
        primaryStatValue: `${acceptedCount} 題`,
        secondaryStatLabel: '評分口碑',
        secondaryStatValue: `${s.rating} ★ (${s.reviewCount}則)`,
        levelCounts,
        domain: s.domain,
        achievementsCount: Math.min(15, 6 + Math.floor(acceptedCount / 4)),
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

  // 2. 卓越提問委託人榜 (Top Questioners)
  const questionersList: LeaderboardEntry[] = [
    {
      rank: 1,
      userId: 'user-author-12',
      name: '沈維新 創辦人',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      title: '高科技循環材料集團 CEO',
      role: 'questioner' as const,
      honorTitle: '傳奇創投領袖',
      score: 98000,
      primaryStatLabel: '懸賞交易額',
      primaryStatValue: '128,000 點',
      secondaryStatLabel: '採納成交率',
      secondaryStatValue: '100% (4/4)',
      levelCounts: { L0: 1, L1: 1, L2: 2, L3: 3, L4: 2 },
      domain: '創新創業',
      achievementsCount: 12,
    },
    {
      rank: 2,
      userId: 'user-questioner',
      name: '林書豪',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      title: '校園生活創新社群發起人 & 連續創業者',
      role: 'questioner' as const,
      honorTitle: '黃金天使委託人',
      score: 36500,
      primaryStatLabel: '懸賞交易額',
      primaryStatValue: '38,600 點',
      secondaryStatLabel: '採納成交率',
      secondaryStatValue: '85% (11/13)',
      levelCounts: { L0: 4, L1: 5, L2: 6, L3: 2, L4: 1 },
      domain: '創新創業',
      achievementsCount: 9,
    },
    {
      rank: 3,
      userId: 'user-auth-mfg',
      name: '張董事長',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      title: '中部工業機械精密組裝廠負責人',
      role: 'questioner' as const,
      honorTitle: '尊爵伯樂金主',
      score: 29000,
      primaryStatLabel: '懸賞交易額',
      primaryStatValue: '31,500 點',
      secondaryStatLabel: '採納成交率',
      secondaryStatValue: '92% (8/9)',
      levelCounts: { L0: 1, L1: 2, L2: 4, L3: 3, L4: 1 },
      domain: '專業問題',
      achievementsCount: 8,
    },
    {
      rank: 4,
      userId: 'user-med',
      name: '郭博翔 醫師',
      avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80',
      title: '台北聯合醫學中心微創外科研究員',
      role: 'questioner' as const,
      honorTitle: '睿智求真者',
      score: 18400,
      primaryStatLabel: '懸賞交易額',
      primaryStatValue: '19,200 點',
      secondaryStatLabel: '採納成交率',
      secondaryStatValue: '88% (6/7)',
      levelCounts: { L0: 2, L1: 3, L2: 3, L3: 2, L4: 0 },
      domain: '學術探討',
      achievementsCount: 7,
    },
    {
      rank: 5,
      userId: 'user-retail',
      name: '王小芬',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
      title: '連鎖餐飲生活選物品牌營運長',
      role: 'questioner' as const,
      honorTitle: '探索發起人',
      score: 12500,
      primaryStatLabel: '懸賞交易額',
      primaryStatValue: '14,000 點',
      secondaryStatLabel: '採納成交率',
      secondaryStatValue: '80% (4/5)',
      levelCounts: { L0: 3, L1: 4, L2: 2, L3: 1, L4: 0 },
      domain: '日常疑難',
      achievementsCount: 5,
    },
  ];

  // 3. 本週交易活躍榜 (Hot Trades)
  const hotTrades: LeaderboardEntry[] = [
    topSolvers[0],
    questionersList[0],
    topSolvers[1] || topSolvers[0],
    questionersList[1],
    topSolvers[2] || topSolvers[0],
  ].map((entry, idx) => ({ ...entry, rank: idx + 1 }));

  return {
    topSolvers,
    topQuestioners: questionersList,
    hotTrades,
  };
}

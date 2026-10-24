const PROPOSAL_CLICKS_KEY = 'ideax_proposal_real_clicks';
const QUESTION_CLICKS_KEY = 'ideax_question_real_clicks';

export function getProposalRealClicks(): Record<string, number> {
  try {
    if (typeof window === 'undefined') return {};
    const saved = localStorage.getItem(PROPOSAL_CLICKS_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

/**
 * 記錄提案點進內頁之瀏覽次數（原子累加）
 */
export function recordProposalViewClick(proposalId: string, currentViews: number = 0): number {
  if (!proposalId) return currentViews;
  try {
    const map = getProposalRealClicks();
    const prev = typeof map[proposalId] === 'number' ? map[proposalId] : currentViews;
    const next = prev + 1;
    map[proposalId] = next;
    localStorage.setItem(PROPOSAL_CLICKS_KEY, JSON.stringify(map));

    // 非同步同步到後端原子遞增
    try {
      fetch(`/api/competition/proposals/${encodeURIComponent(proposalId)}/view`, {
        method: 'POST',
      }).catch(() => {});
    } catch {}

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ideax_proposal_views_updated', { detail: { id: proposalId, views: next } }));
    }

    return next;
  } catch {
    return currentViews + 1;
  }
}

export function getQuestionRealClicks(): Record<string, number> {
  try {
    if (typeof window === 'undefined') return {};
    const saved = localStorage.getItem(QUESTION_CLICKS_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

/**
 * 記錄問題 / 痛點 / 討論 / 軟體作品點進內頁之瀏覽次數（原子累加）
 */
export function recordQuestionViewClick(questionId: string, currentViews: number = 0): number {
  if (!questionId) return currentViews;
  try {
    const map = getQuestionRealClicks();
    const prev = typeof map[questionId] === 'number' ? map[questionId] : currentViews;
    const next = prev + 1;
    map[questionId] = next;
    localStorage.setItem(QUESTION_CLICKS_KEY, JSON.stringify(map));

    // 非同步同步到後端原子遞增
    try {
      fetch(`/api/competition/proposals/${encodeURIComponent(questionId)}/view`, {
        method: 'POST',
      }).catch(() => {});
    } catch {}

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ideax_question_views_updated', { detail: { id: questionId, views: next } }));
    }

    return next;
  } catch {
    return currentViews + 1;
  }
}

export function getEffectiveProposalViews(proposalId: string, fallbackViews: number = 0): number {
  try {
    const map = getProposalRealClicks();
    if (typeof map[proposalId] === 'number') {
      return Math.max(map[proposalId], fallbackViews);
    }
  } catch {}
  return fallbackViews;
}

export function getEffectiveQuestionViews(questionId: string, fallbackViews: number = 0): number {
  try {
    const map = getQuestionRealClicks();
    if (typeof map[questionId] === 'number') {
      return Math.max(map[questionId], fallbackViews);
    }
  } catch {}
  return fallbackViews;
}

export function applyRealClicksToProposals<T extends { id: string; viewsCount?: number; views?: number }>(proposals: T[]): T[] {
  const map = getProposalRealClicks();
  return proposals.map((p) => {
    const rawCount = typeof p.viewsCount === 'number' ? p.viewsCount : (typeof p.views === 'number' ? p.views : 0);
    const localCount = typeof map[p.id] === 'number' ? map[p.id] : 0;
    const highest = Math.max(rawCount, localCount);
    return {
      ...p,
      viewsCount: highest,
      views: highest,
    };
  });
}

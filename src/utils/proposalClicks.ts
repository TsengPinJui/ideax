import { isSimulatedQuestion } from '../data/virtualProposalsSeed';
import { isMockQuestionId } from '../data/mockData';

const PROPOSAL_CLICKS_KEY = 'ideax_proposal_real_clicks_v2';
const QUESTION_CLICKS_KEY = 'ideax_question_real_clicks_v2';

export function isFakeOrSeedId(id?: string | null): boolean {
  if (!id) return false;
  return (
    isSimulatedQuestion(id) ||
    isMockQuestionId(id) ||
    id.startsWith('game-hot-') ||
    id.startsWith('demo-') ||
    id.startsWith('test-') ||
    id.startsWith('p-demo-') ||
    id.startsWith('prop-demo-') ||
    id.startsWith('sim-')
  );
}

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
 * 記錄提案點進內頁之瀏覽次數（原子累加，假提案從 0 開始計算）
 */
export function recordProposalViewClick(proposalId: string, currentViews: number = 0): number {
  if (!proposalId) return currentViews;
  const baseViews = isFakeOrSeedId(proposalId) ? 0 : currentViews;
  try {
    const map = getProposalRealClicks();
    const prev = typeof map[proposalId] === 'number' ? map[proposalId] : baseViews;
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
    return baseViews + 1;
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
 * 記錄問題 / 痛點 / 討論 / 軟體作品點進內頁之瀏覽次數（原子累加，假提案從 0 開始計算）
 */
export function recordQuestionViewClick(questionId: string, currentViews: number = 0): number {
  if (!questionId) return currentViews;
  const baseViews = isFakeOrSeedId(questionId) ? 0 : currentViews;
  try {
    const map = getQuestionRealClicks();
    const prev = typeof map[questionId] === 'number' ? map[questionId] : baseViews;
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
    return baseViews + 1;
  }
}

export function getEffectiveProposalViews(proposalId: string, fallbackViews: number = 0): number {
  const safeFallback = isFakeOrSeedId(proposalId) ? 0 : fallbackViews;
  try {
    const map = getProposalRealClicks();
    if (typeof map[proposalId] === 'number') {
      return Math.max(map[proposalId], safeFallback);
    }
  } catch {}
  return safeFallback;
}

export function getEffectiveQuestionViews(questionId: string, fallbackViews: number = 0): number {
  const safeFallback = isFakeOrSeedId(questionId) ? 0 : fallbackViews;
  try {
    const map = getQuestionRealClicks();
    if (typeof map[questionId] === 'number') {
      return Math.max(map[questionId], safeFallback);
    }
  } catch {}
  return safeFallback;
}

export function applyRealClicksToProposals<T extends { id: string; viewsCount?: number; views?: number }>(proposals: T[]): T[] {
  const map = getProposalRealClicks();
  return proposals.map((p) => {
    const isFake = isFakeOrSeedId(p.id) || Boolean((p as any).isSimulated);
    const rawCount = isFake
      ? 0
      : typeof p.viewsCount === 'number'
      ? p.viewsCount
      : typeof p.views === 'number'
      ? p.views
      : 0;
    const localCount = typeof map[p.id] === 'number' ? map[p.id] : 0;
    const highest = Math.max(rawCount, localCount);
    return {
      ...p,
      viewsCount: highest,
      views: highest,
    };
  });
}

const STORAGE_KEY = 'ideax_proposal_real_clicks';

export function getProposalRealClicks(): Record<string, number> {
  try {
    if (typeof window === 'undefined') return {};
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

export function recordProposalViewClick(proposalId: string, currentViews: number = 36): number {
  try {
    if (typeof window === 'undefined') return currentViews + 1;
    const map = getProposalRealClicks();
    const base = typeof map[proposalId] === 'number' ? map[proposalId] : currentViews;
    const nextViews = base + 1;
    map[proposalId] = nextViews;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    return nextViews;
  } catch {
    return currentViews + 1;
  }
}

export function applyRealClicksToProposals<T extends { id: string; viewsCount?: number; views?: number }>(proposals: T[]): T[] {
  const map = getProposalRealClicks();
  return proposals.map((p) => {
    const rawCount = typeof p.viewsCount === 'number' ? p.viewsCount : (typeof p.views === 'number' ? p.views : 36);
    const localCount = typeof map[p.id] === 'number' ? map[p.id] : 0;
    const highest = Math.max(rawCount, localCount);
    return {
      ...p,
      viewsCount: highest,
      views: highest,
    };
  });
}

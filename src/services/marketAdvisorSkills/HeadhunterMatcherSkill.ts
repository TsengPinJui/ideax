import { IAgentSkill, HeadhunterMatcherInput, HeadhunterMatcherOutput, MarketAdvisorHeadhunterMatch } from './types';

/**
 * Skill 2: 智慧獵頭延攬與專家嚴格篩選技能 (Headhunter Matcher & Talent Screening Skill)
 * 深入比對全站專家庫，契合度不設人為上下限（0~100%），嚴格過濾無實質關聯之專家
 */
export class HeadhunterMatcherSkill implements IAgentSkill<HeadhunterMatcherInput, HeadhunterMatcherOutput> {
  readonly skillId = 'market_advisor_headhunter_matcher';
  readonly skillName = '智慧獵頭延攬與專家嚴格篩選技能';
  readonly description = '針對特定技術需求或商業痛點，深入調查與評估專家實戰履歷，精準推薦人選與契合度分析。';

  async execute(input: HeadhunterMatcherInput): Promise<HeadhunterMatcherOutput> {
    const { query, candidatePool } = input;

    try {
      const res = await fetch('/api/agent/market-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'headhunter',
          payload: { query, solvers: candidatePool },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.matches && Array.isArray(data.matches)) {
          const mapped = data.matches
            .map((m: any) => {
              const solver = candidatePool.find((s) => s.id === m.solverId);
              if (!solver) return null;
              return {
                solverId: m.solverId,
                solver,
                matchScore: Number(m.matchScore) || 0,
                matchReason: m.matchReason,
                keyStrengths: solver.skills.slice(0, 3),
                recommendedRole: solver.title || '特邀認證顧問',
                hasRelevance: m.hasRelevance !== false,
              };
            })
            .filter(Boolean) as MarketAdvisorHeadhunterMatch[];

          // 嚴格篩選：保留契合度達標之真實匹配專家
          const qualifying = mapped.filter((m) => m.matchScore >= 40 && m.hasRelevance);
          return {
            matches: qualifying.length > 0 ? qualifying.slice(0, 4) : mapped.slice(0, 4),
            source: data.source || 'market-advisor',
          };
        }
      }
    } catch {
      // quiet fallback
    }

    // Fallback to /api/ai/headhunter-search
    try {
      const res = await fetch('/api/ai/headhunter-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, solvers: candidatePool }),
      });
      if (res.ok) {
        const data = await res.json();
        const mapped = (data.matches || [])
          .map((m: any) => {
            const solver = candidatePool.find((s) => s.id === m.solverId);
            if (!solver) return null;
            return {
              solverId: m.solverId,
              solver,
              matchScore: Number(m.matchScore) || 0,
              matchReason: m.matchReason,
              keyStrengths: solver.skills.slice(0, 3),
              recommendedRole: solver.title || '特邀認證顧問',
              hasRelevance: m.hasRelevance !== false,
            };
          })
          .filter(Boolean);
        const qualifying = mapped.filter((m: any) => m.matchScore >= 40 && m.hasRelevance);
        return {
          matches: qualifying.length > 0 ? qualifying.slice(0, 4) : mapped.slice(0, 4),
          source: data.source || 'market-advisor-heuristic',
        };
      }
    } catch {
      // quiet fallback
    }

    return { matches: [], source: 'none' };
  }
}

export const headhunterMatcherSkill = new HeadhunterMatcherSkill();

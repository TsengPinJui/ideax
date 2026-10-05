import { Question, Solver } from '../types';

export interface TwoWayMatchData {
  solver: Solver;
  question: Question;
  demandSideScore: number; // 市場顧問（由題找人契合度）
  supplySideScore: number; // AICRM 特助（由人找題意向度）
  twoWayFitScore: number;  // 雙向交叉媒合總分 (0 ~ 100)
  isHandshake: boolean;    // 是否觸發雙向撮合握手 (總分 >= 80)
  matchReason: string;
  keyStrengths: string[];
  clientPainPoint: string;
  recommendedPitchAngle: string;
  estimatedProfit: number;
  icebreakerPitches: {
    calm: string;   // 沉穩顧問
    sharp: string;  // 專業精闢
    warm: string;   // 熱情親和
  };
  handshakeTime: string;
}

/**
 * 智慧計算題目與專家的雙向交集契合度
 */
export function calculateTwoWayMatchesForQuestion(
  question: Question,
  solvers: Solver[]
): TwoWayMatchData[] {
  if (!question || !solvers || solvers.length === 0) return [];

  const qText = `${question.title} ${question.description || ''} ${question.category} ${question.subcategory || ''} ${(question.tags || []).join(' ')}`.toLowerCase();
  const qBounty = question.bounty || 0;

  const results: TwoWayMatchData[] = solvers
    .filter((s) => s.id !== question.authorId && s.userId !== question.authorId)
    .map((solver) => {
      // 1. 領域重疊比對
      const primaryDomainMatch = solver.domain === question.category;
      const subdomains = solver.domains || (solver.domain ? [solver.domain] : []);
      const multiDomainMatch = subdomains.some((d) => d === question.category);
      let domainScore = primaryDomainMatch ? 90 : multiDomainMatch ? 75 : 40;

      // 2. 關鍵標籤與專長關鍵字比對
      const solverKeywords = [
        ...(solver.skills || []),
        solver.title,
        solver.bio || '',
        solver.name,
      ].join(' ').toLowerCase();

      let keywordHits = 0;
      const questionWords = (question.tags || []).concat([
        question.category,
        question.subcategory || '',
        ...(question.title.split(/[\s,，、/]+/)),
      ]);

      questionWords.forEach((word) => {
        if (word && word.length >= 2 && solverKeywords.includes(word.toLowerCase())) {
          keywordHits++;
        }
      });

      const keywordScore = Math.min(95, 50 + keywordHits * 15);

      // 3. 專家認證權重
      const expertBonus = solver.verified ? 10 : 0;
      const ratingBonus = ((solver.rating || 4.8) - 4.0) * 10;

      // 需求側分數（市場顧問由題找人）
      const demandSideScore = Math.min(99, Math.round(domainScore * 0.5 + keywordScore * 0.4 + expertBonus + ratingBonus));

      // 供給側分數（AICRM 由專家巡航獵題）
      const bountyAppeal = qBounty >= 1000 ? 95 : qBounty >= 500 ? 88 : qBounty >= 200 ? 80 : 70;
      const urgencyAppeal = ((question as any).urgency === 'urgent' || (question as any).specialZone === 'bounty' || question.level === 'L4' || question.level === 'L3') ? 95 : 82;
      const supplySideScore = Math.min(99, Math.round(domainScore * 0.45 + bountyAppeal * 0.35 + urgencyAppeal * 0.2));

      // 雙向交集握手總分
      const twoWayFitScore = Math.min(99, Math.round(demandSideScore * 0.52 + supplySideScore * 0.48));
      const isHandshake = twoWayFitScore >= 78;

      // 預估實收淨利 (大師方案 98%)
      const estimatedProfit = Math.round(qBounty * 0.98);

      // 生成客製化切入方針與破冰話術
      const painPoint = question.description?.slice(0, 45) || question.title;
      const angle = `${solver.title || '專家'} 具備 ${solver.domain || question.category} 深厚實戰底蘊，能針對「${question.title.slice(0, 20)}」提供直擊關鍵之可行解法。`;

      const icebreakerPitches = {
        calm: `您好！關注到您發布的《${question.title.slice(0, 18)}...》，我在 ${solver.domain || question.category} 領域有多年專案實戰經驗，針對目前遇到的痛點，已初步為您梳理三階段破局架構，期待能協助您高質量落地解決。`,
        sharp: `您好，針對《${question.title.slice(0, 16)}...》核心癥結點，關鍵在於架構切分與邊界控制。我過往曾主導同類型案例交付，若需要可在 24hr 內提供明確評估與里程碑規劃。`,
        warm: `您好！看到您的提問非常具代表性～我在這塊領域正好有完整的落地方案與工具包，若有任何即時疑問歡迎隨時交流，很樂意為您解答！`,
      };

      const keyStrengths = [
        solver.title || '認證資深專家',
        `履約評分 ${solver.rating || 5.0} ★`,
        `專精 ${solver.domain || question.category}`,
      ];

      return {
        solver,
        question,
        demandSideScore,
        supplySideScore,
        twoWayFitScore,
        isHandshake,
        matchReason: angle,
        keyStrengths,
        clientPainPoint: painPoint,
        recommendedPitchAngle: angle,
        estimatedProfit,
        icebreakerPitches,
        handshakeTime: '剛剛',
      };
    });

  // 依雙向契合總分降序排序
  return results.sort((a, b) => b.twoWayFitScore - a.twoWayFitScore);
}

/**
 * 為專家計算全站雙向握手推薦之高價值題目清單
 */
export function calculateTwoWayMatchesForSolver(
  solver: Solver,
  questions: Question[]
): TwoWayMatchData[] {
  if (!solver || !questions || questions.length === 0) return [];

  const matched: TwoWayMatchData[] = [];

  questions.forEach((q) => {
    if (q.status === 'open' && q.authorId !== solver.id && q.authorId !== solver.userId) {
      const singleResults = calculateTwoWayMatchesForQuestion(q, [solver]);
      if (singleResults.length > 0 && singleResults[0].twoWayFitScore >= 70) {
        matched.push(singleResults[0]);
      }
    }
  });

  return matched.sort((a, b) => b.twoWayFitScore - a.twoWayFitScore);
}

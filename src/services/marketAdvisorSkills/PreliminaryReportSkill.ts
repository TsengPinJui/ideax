import { getAuthHeaders } from '../authHeader';
import { IAgentSkill, PreliminaryReportInput, PreliminaryReportOutput } from './types';
import { generatePreliminaryReportWithAI } from '../aiService';

/**
 * Skill 3: 付費深度問題分析與解題架構報告技能 (Paid Preliminary Report Skill)
 * 當首位用戶點選解鎖時動態生成，並儲存至資料庫下次解鎖直接使用
 */
export class PreliminaryReportSkill implements IAgentSkill<PreliminaryReportInput, PreliminaryReportOutput> {
  readonly skillId = 'market_advisor_preliminary_report';
  readonly skillName = '付費深度問題分析與解題架構報告技能';
  readonly description = '針對懸賞痛點深度診斷，輸出三維度商業分析報告（核心癥結本質、建議三步驟解決方案、解題專家畫像與防坑指南）。';

  async execute(input: PreliminaryReportInput): Promise<PreliminaryReportOutput> {
    const { question } = input;

    try {
      const res = await fetch('/api/agent/market-advisor', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          mode: 'preliminary_report',
          payload: {
            questionTitle: question.title,
            questionDescription: question.description || '',
            category: question.category,
            subcategory: question.subcategory,
            bounty: question.bounty,
          },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const reportData = data?.report || data?.data;
        if (reportData) {
          return {
            id: `pre-report-live-${question.id}-${Date.now()}`,
            generatedAt: new Date().toISOString(),
            problemAnalysis: {
              coreDiagnosis: reportData.problemAnalysis?.coreDiagnosis || '專案關鍵痛點與商業邊界深度剖析',
              painPointBreakdown: reportData.problemAnalysis?.painPointBreakdown || [],
              technicalOrBusinessBarriers: reportData.problemAnalysis?.technicalOrBusinessBarriers || [],
            },
            recommendedSolutions: {
              strategicPillars: reportData.recommendedSolutions?.strategicPillars || [],
              phaseSteps: reportData.recommendedSolutions?.phaseSteps || [],
              expectedOutcomes: reportData.recommendedSolutions?.expectedOutcomes || '具體成果可驗收指標',
            },
            solvingDirections: {
              recommendedDomain: reportData.solvingDirections?.recommendedDomain || question.category,
              expertCompetencies: reportData.solvingDirections?.expertCompetencies || [],
              riskWarnings: reportData.solvingDirections?.riskWarnings || [],
            },
            costPoints: 50,
            unlockedUserIds: [],
          };
        }
      }
    } catch {
      // quiet fallback
    }

    return generatePreliminaryReportWithAI(question);
  }
}

export const preliminaryReportSkill = new PreliminaryReportSkill();

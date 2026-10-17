import { IAgentSkill, QuestionClassifierInput, QuestionClassifierOutput } from './types';
import { analyzeQuestionWithAI } from '../aiService';

/**
 * Skill 1: 題目分類與標籤歸納技能 (Question Classifier & Tagger Skill)
 * 當發文未選擇主/子分類或標籤少於 2 個時，自動調用此技能進行領域判定與標籤萃取
 */
export class QuestionClassifierSkill implements IAgentSkill<QuestionClassifierInput, QuestionClassifierOutput> {
  readonly skillId = 'market_advisor_question_classifier';
  readonly skillName = '題目分類與標籤歸納技能';
  readonly description = '依據題意與背景描述，深度分析痛點本質，精準歸納主領域、子領域、價值分級與 3~5 個關鍵標籤。';

  async execute(input: QuestionClassifierInput): Promise<QuestionClassifierOutput> {
    const { title, description } = input;
    try {
      const res = await fetch('/api/agent/market-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'classify_and_tag',
          payload: { title, description },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.data) return data.data as QuestionClassifierOutput;
      }
    } catch {
      // quiet fallback
    }

    return analyzeQuestionWithAI(title, description);
  }
}

export const questionClassifierSkill = new QuestionClassifierSkill();

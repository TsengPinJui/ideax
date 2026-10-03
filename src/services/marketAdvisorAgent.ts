import { Question, Solver, AIPreliminaryReport } from '../types';
import { AIAnalysisResult, AIDisputeMediationResult } from './aiService';
import {
  questionClassifierSkill,
  headhunterMatcherSkill,
  preliminaryReportSkill,
  disputeMediatorSkill,
  jinaCrawlerSkill,
  QuestionClassifierSkill,
  HeadhunterMatcherSkill,
  PreliminaryReportSkill,
  DisputeMediatorSkill,
  JinaCrawlerSkill,
  MarketAdvisorHeadhunterMatch,
  JinaCrawlerOutput,
} from './marketAdvisorSkills';

export * from './marketAdvisorSkills';

/**
 * IdeaX 專屬 AI Agent：「市場顧問」
 * 專屬統籌五大獨立技能 (Skills)：
 * 1. 題目分類與標籤歸納技能 (QuestionClassifierSkill)
 * 2. 智慧獵頭延攬與專家嚴格篩選技能 (HeadhunterMatcherSkill)
 * 3. 付費深度問題分析與解題架構報告技能 (PreliminaryReportSkill)
 * 4. 智慧合約履約爭議調解仲裁技能 (DisputeMediatorSkill)
 * 5. Jina 網頁即時爬蟲與市場情報蒐集技能 (JinaCrawlerSkill)
 */
export class MarketAdvisorAgent {
  readonly agentName = '市場顧問';
  readonly description = 'IdeaX 專屬 AI Agent，專責智慧獵頭、題目自動分類與標籤萃取、付費深度分析報告、智慧合約爭議調解仲裁與 Jina 即時網頁市場情報爬取。';

  // 註冊之五大獨立 Skills
  readonly skills = {
    questionClassifier: questionClassifierSkill,
    headhunterMatcher: headhunterMatcherSkill,
    preliminaryReport: preliminaryReportSkill,
    disputeMediator: disputeMediatorSkill,
    jinaCrawler: jinaCrawlerSkill,
  };

  /**
   * Skill 1：題目分類與標籤歸納
   */
  async classifyAndTagQuestion(title: string, description: string): Promise<AIAnalysisResult> {
    return this.skills.questionClassifier.execute({ title, description });
  }

  /**
   * Skill 2：智慧獵頭與專家嚴格篩選
   */
  async matchHeadhunter(query: string, candidatePool: Solver[]): Promise<{
    matches: MarketAdvisorHeadhunterMatch[];
    source: string;
  }> {
    return this.skills.headhunterMatcher.execute({ query, candidatePool });
  }

  /**
   * Skill 3：付費分析報告產出
   */
  async generatePreliminaryReport(question: Question): Promise<AIPreliminaryReport> {
    return this.skills.preliminaryReport.execute({ question });
  }

  /**
   * Skill 4：智慧合約履約爭議調解仲裁
   */
  async mediateDispute(
    questionTitle: string,
    questionDescription: string,
    actualDeliverables: string,
    disputeReason: string,
    communicationLogs?: string,
    totalEscrowAmount?: number
  ): Promise<AIDisputeMediationResult> {
    return this.skills.disputeMediator.execute({
      questionTitle,
      questionDescription,
      actualDeliverables,
      disputeReason,
      communicationLogs,
      totalEscrowAmount,
    });
  }

  /**
   * Skill 5：Jina 網頁即時爬蟲與市場情報蒐集
   */
  async crawlOrSearchWeb(urlOrQuery: { url?: string; query?: string }): Promise<JinaCrawlerOutput> {
    return this.skills.jinaCrawler.execute(urlOrQuery);
  }
}

export const marketAdvisorAgent = new MarketAdvisorAgent();

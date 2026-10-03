import { Category, ProblemLevel, Solver, Question, AIPreliminaryReport } from '../../types';
import { AIAnalysisResult, AIDisputeMediationResult } from '../aiService';

export interface IAgentSkill<TInput, TOutput> {
  readonly skillId: string;
  readonly skillName: string;
  readonly description: string;
  execute(input: TInput): Promise<TOutput>;
}

export interface HeadhunterMatcherInput {
  query: string;
  candidatePool: Solver[];
}

export interface MarketAdvisorHeadhunterMatch {
  solverId: string;
  solver: Solver;
  matchScore: number;
  matchReason: string;
  keyStrengths: string[];
  recommendedRole: string;
  hasRelevance: boolean;
}

export interface HeadhunterMatcherOutput {
  matches: MarketAdvisorHeadhunterMatch[];
  source: string;
}

export interface QuestionClassifierInput {
  title: string;
  description: string;
}

export type QuestionClassifierOutput = AIAnalysisResult;

export interface PreliminaryReportInput {
  question: Question;
}

export type PreliminaryReportOutput = AIPreliminaryReport;

export interface DisputeMediatorInput {
  questionTitle: string;
  questionDescription: string;
  actualDeliverables: string;
  disputeReason: string;
  communicationLogs?: string;
  totalEscrowAmount?: number;
}

export type DisputeMediatorOutput = AIDisputeMediationResult;

export interface JinaCrawlerInput {
  url?: string;
  query?: string;
}

export interface JinaCrawlerOutput {
  title: string;
  content: string;
  url: string;
  description?: string;
  source: string;
}

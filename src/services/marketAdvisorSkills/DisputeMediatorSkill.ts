import { getAuthHeaders } from '../authHeader';
import { IAgentSkill, DisputeMediatorInput, DisputeMediatorOutput } from './types';
import { mediateDisputeWithAI } from '../aiService';

/**
 * Skill 4: 智慧合約履約爭議調解仲裁技能 (Dispute Mediator & Settlement Skill)
 * 參照全球頂尖金融智庫（如摩根大通 J.P. Morgan）三方客觀證據鏈稽核標準，
 * 判定買方需求蔓延（Scope Creep）並產出雙軌和解方案（比例折讓 / 限期補正）。
 */
export class DisputeMediatorSkill implements IAgentSkill<DisputeMediatorInput, DisputeMediatorOutput> {
  readonly skillId = 'market_advisor_dispute_mediator';
  readonly skillName = '智慧合約履約爭議調解仲裁技能';
  readonly description = '平行比對原始需求、實際交付成果與雙方通訊日誌，判定履行偏差與責任比例，產出具備法律效力之雙軌和解協議。';

  async execute(input: DisputeMediatorInput): Promise<DisputeMediatorOutput> {
    const {
      questionTitle,
      questionDescription,
      actualDeliverables,
      disputeReason,
      communicationLogs,
      totalEscrowAmount,
    } = input;

    try {
      const res = await fetch('/api/agent/market-advisor', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          mode: 'mediate_dispute',
          payload: {
            questionTitle,
            questionDescription,
            proposalPreview: actualDeliverables,
            actualDeliverables,
            communicationLogs: communicationLogs || '',
            disputeReason,
            totalEscrowAmount: totalEscrowAmount || 2000,
          },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.data) return data.data as DisputeMediatorOutput;
      }
    } catch {
      // quiet fallback
    }

    return mediateDisputeWithAI(
      questionTitle,
      questionDescription,
      actualDeliverables,
      disputeReason,
      communicationLogs,
      totalEscrowAmount
    );
  }
}

export const disputeMediatorSkill = new DisputeMediatorSkill();

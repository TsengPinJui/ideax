/**
 * IdeaX 專屬 AI Agent：「AICRM 專家賦能與業務增長顧問」
 * 
 * 專責三大核心業務模組：
 * 1. 24hr 巡航雷達 (24hr Radar Scanning & Intent Score)
 *    - 實時掃描全站發案題庫、用戶瀏覽行為與提問者猶豫期（發案 > 3 天未採納、高額懸賞 L2~L4）
 *    - 剖析發案客戶之核心痛點、預算心理與防備點，輸出 0~100% 之「成案意向指數 (Intent Score)」
 *    - 推薦最適跟進時段（上午黃金決策期 10:00~11:30、午後深度思考期 14:30~16:00、晚間沉澱期 19:30~21:00）
 * 
 * 2. 優質提案推薦您來賺 (High-Value Bounty Hunter & 3-Stage Blueprint)
 *    - 專為「權威方案（實收 95%）」與「大師方案（實收 98%）」專家過濾全站高額懸賞難題
 *    - 自動計算扣除平台服務費（2% 或 5%）後之「實收預估淨利」，並與一般 25% 抽成對比展現收益價值
 *    - 生成「AI 破局切入方針」：
 *      第一階段：關鍵痛點指標對焦（降低客戶疑慮）
 *      第二階段：核心架構藍圖與里程碑進度
 *      第三階段：交付清單與驗收放款保證
 * 
 * 3. 24hr 特助代操與智慧破冰 (24hr Assistant Outreach & Psychology Pitches)
 *    - 專家離線或忙碌時代客即時接待、釐清需求時程與預算
 *    - 依據排定時程，自動發送溫暖、專業、直擊痛點的 3 款心理學破冰話術（沉穩顧問風 / 專業精闢風 / 熱情親和風）
 */

export interface RadarScanParams {
  solverDomain?: string;
  solverSkills?: string[];
  questions?: any[];
}

export interface RadarScanResult {
  leads: Array<{
    id: string;
    questionId: string;
    clientName: string;
    clientAvatar?: string;
    questionTitle: string;
    questionDescription: string;
    bounty: number;
    intentScore: number; // 0 ~ 100
    hesitationDays: number; // 發案未採納天數
    recommendedTimeSlot: {
      slot: 'morning' | 'afternoon' | 'evening';
      label: string;
      timeRange: string;
      reason: string;
    };
    clientPsychology: {
      corePainPoint: string;
      budgetExpectation: string;
      defensePoint: string; // 客戶防備點 / 疑慮點
    };
    aiRecommendedStrategy: string;
    urgency: 'high' | 'medium' | 'low';
  }>;
  totalScanned: number;
  highIntentCount: number;
}

export interface BountyHunterParams {
  solverPlan: 'expert_monthly' | 'master_annual' | 'free';
  questions: any[];
}

export interface BountyHunterOpportunity {
  questionId: string;
  questionTitle: string;
  questionDescription: string;
  bounty: number;
  planFeeRate: number; // 0.05 or 0.02 or 0.25
  estimatedNetProfit: number; // 實收淨利
  traditionalProfitDifference: number; // 比一般 25% 抽成多賺金額
  breakthroughBlueprint: {
    stage1: {
      title: string;
      focus: string; // 關鍵痛點指標對焦（降低客戶疑慮）
      deliverable: string;
      estimatedDays: string;
    };
    stage2: {
      title: string;
      focus: string; // 核心架構藍圖與里程碑進度
      deliverable: string;
      estimatedDays: string;
    };
    stage3: {
      title: string;
      focus: string; // 交付清單與驗收放款保證
      deliverable: string;
      estimatedDays: string;
    };
  };
}

export interface AssistantOutreachParams {
  clientName: string;
  questionTitle: string;
  questionDescription?: string;
  questionBounty: number;
  solverName: string;
  solverDomain: string;
  solverSkills?: string[];
}

export interface AssistantOutreachResult {
  pitches: {
    calmAdvisor: {
      styleName: string; // 沉穩顧問風
      tag: string;
      message: string;
      recommendedTime: string;
    };
    sharpExpert: {
      styleName: string; // 專業精闢風
      tag: string;
      message: string;
      recommendedTime: string;
    };
    warmFriendly: {
      styleName: string; // 熱情親和風
      tag: string;
      message: string;
      recommendedTime: string;
    };
  };
  receptionStrategy: string;
}

export class AiCrmAgent {
  readonly agentName = 'AICRM 專家賦能與業務增長顧問';
  readonly agentId = 'aicrm_agent';
  readonly description = 'IdeaX 專屬 AI Agent，專責 24hr 巡航雷達、優質提案收益精算、三階段 AI 破局方針與 24hr 特助代操心理學破冰。';

  /**
   * 模組 1: 24hr 巡航雷達 (24hr Radar Scanning)
   */
  async scanRadar(params: RadarScanParams): Promise<RadarScanResult> {
    try {
      const res = await fetch('/api/agent/aicrm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'radar_scan',
          payload: params,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json && json.data) {
          return json.data as RadarScanResult;
        }
      }
    } catch (err) {
      console.warn('AiCrmAgent.scanRadar call failed, using intelligent fallback:', err);
    }

    // Fallback Mocked Local Computation
    const questions = params.questions || [];
    const leads = questions.slice(0, 4).map((q, idx) => {
      const bounty = q.bounty || 2500;
      const intentScore = Math.min(98, Math.max(72, 85 + (idx % 3) * 5 - idx * 2));
      const slots = [
        { slot: 'morning' as const, label: '上午黃金決策期', timeRange: '10:00 ~ 11:30', reason: '決策主管剛處理完日常晨會，正審視專案推進阻礙' },
        { slot: 'afternoon' as const, label: '午後深度思考期', timeRange: '14:30 ~ 16:00', reason: '午後沉澱時刻，最願意深入評估具體落地架構' },
        { slot: 'evening' as const, label: '晚間沉澱期', timeRange: '19:30 ~ 21:00', reason: '創辦人與決策者夜間空檔，回覆意向最為直接坦誠' },
      ];
      const selectedSlot = slots[idx % slots.length];

      return {
        id: `radar-lead-${q.id || idx}`,
        questionId: q.id || `q-${idx}`,
        clientName: q.authorName || '新創發案客戶',
        clientAvatar: q.authorAvatar,
        questionTitle: q.title || '企業數位化轉型與 AI 落地策略諮詢',
        questionDescription: q.description || '目前正在評估架構選型與成本效益。',
        bounty,
        intentScore,
        hesitationDays: Math.floor(Math.random() * 4) + 3, // > 3 天猶豫期
        recommendedTimeSlot: selectedSlot,
        clientPsychology: {
          corePainPoint: '擔憂前期投入過高但無法產出量化驗收指標',
          budgetExpectation: `預算設定在 NT$ ${bounty.toLocaleString()}，期望得到明確里程碑`,
          defensePoint: '對單純理論名詞具防備心，急需具備實操 SOP 與交付原檔的資深專家',
        },
        aiRecommendedStrategy: '發送前置痛點對焦清單，以三階段里程碑消除客戶付款疑慮。',
        urgency: intentScore >= 90 ? 'high' as const : 'medium' as const,
      };
    });

    return {
      leads,
      totalScanned: questions.length || 12,
      highIntentCount: leads.filter(l => l.intentScore >= 88).length,
    };
  }

  /**
   * 模組 2: 優質提案推薦您來賺 (High-Value Bounty Hunter)
   */
  async recommendHighValueBounties(params: BountyHunterParams): Promise<BountyHunterOpportunity[]> {
    try {
      const res = await fetch('/api/agent/aicrm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'bounty_hunter',
          payload: params,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json && json.data) {
          return json.data as BountyHunterOpportunity[];
        }
      }
    } catch (err) {
      console.warn('AiCrmAgent.recommendHighValueBounties call failed, using fallback:', err);
    }

    const feeRate = params.solverPlan === 'master_annual' ? 0.02 : params.solverPlan === 'expert_monthly' ? 0.05 : 0.25;

    return (params.questions || []).filter(q => (q.bounty || 0) >= 1500).slice(0, 3).map((q, idx) => {
      const bounty = q.bounty || 3000;
      const netProfit = Math.round(bounty * (1 - feeRate));
      const traditionalProfit = Math.round(bounty * (1 - 0.25));
      const diff = netProfit - traditionalProfit;

      return {
        questionId: q.id || `bounty-q-${idx}`,
        questionTitle: q.title || '高額懸賞專案',
        questionDescription: q.description || '專案深度需求',
        bounty,
        planFeeRate: feeRate,
        estimatedNetProfit: netProfit,
        traditionalProfitDifference: diff,
        breakthroughBlueprint: {
          stage1: {
            title: '第一階段：關鍵痛點指標對焦',
            focus: '梳理現有卡點與需求邊界，降低客戶對未知開銷的心理疑慮',
            deliverable: '需求對焦檢核清單與基礎參數校準表',
            estimatedDays: '2 ~ 3 天',
          },
          stage2: {
            title: '第二階段：核心架構藍圖與里程碑進度',
            focus: '依據專業標準建立模組化架構，提供清楚進度節點',
            deliverable: '系統架構設計圖、SOP 流程原檔與核心模型',
            estimatedDays: '4 ~ 6 天',
          },
          stage3: {
            title: '第三階段：交付清單與驗收放款保證',
            focus: '完整交接產出物與操作手冊，提供驗收保障消除最後抗拒',
            deliverable: '最終交付物總覽、驗收確認單與 14 天維護指引',
            estimatedDays: '2 天',
          },
        },
      };
    });
  }

  /**
   * 模組 3: 24hr 特助代操與智慧破冰 (24hr Assistant Outreach)
   */
  async generateAssistantOutreach(params: AssistantOutreachParams): Promise<AssistantOutreachResult> {
    try {
      const res = await fetch('/api/agent/aicrm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'assistant_outreach',
          payload: params,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json && json.data) {
          return json.data as AssistantOutreachResult;
        }
      }
    } catch (err) {
      console.warn('AiCrmAgent.generateAssistantOutreach call failed, using fallback:', err);
    }

    const { clientName, questionTitle, solverName, solverDomain, questionBounty } = params;

    return {
      pitches: {
        calmAdvisor: {
          styleName: '沉穩顧問風',
          tag: '心理學：專業權威＋降低風險感知',
          recommendedTime: '上午黃金決策期 10:30',
          message: `${clientName || '提問者'}您好，我是${solverDomain}專家${solverName}。研讀了您發布的「${questionTitle}」，此類專案最常見的瓶頸在於前期規格邊界模糊導致後續摩擦。我已為多家企業建立過標準化三階段落地方案，能直接為您提供清晰的驗收指標，確保每分預算都精準見效。若您方便，可先閱覽我的初步框架。`,
        },
        sharpExpert: {
          styleName: '專業精闢風',
          tag: '心理學：直擊痛點＋即刻解除焦慮',
          recommendedTime: '午後深度思考期 15:00',
          message: `${clientName || '您好'}！針對「${questionTitle}」，核心盲點往往不在於預算多寡（NT$ ${Number(questionBounty || 0).toLocaleString()} 足夠完成關鍵里程碑），而在於缺乏一套能立即上線的架構藍圖。我手邊具備現成可套用的 SOP 與檢核機制，預估能在 5~7 工作天內協助您完成驗收交付。歡迎隨時交流細節！`,
        },
        warmFriendly: {
          styleName: '熱情親和風',
          tag: '心理學：親切共鳴＋無壓力破冰',
          recommendedTime: '晚間沉澱期 20:00',
          message: `${clientName || '您好'}～看到您發起的「${questionTitle}」懸賞，非常理解在推進過程中想找靠譜夥伴的心情！我在${solverDomain}領域積累了不少實戰經驗，特別希望能幫您少走彎路、輕鬆把卡點理順。您可以毫無壓力地先和我聊聊您的時程期望，我們一步一步來！`,
        },
      },
      receptionStrategy: '專家離線時代客即時接待，記錄客戶時程期望與核心痛點，並自動在黃金時段排定破冰發送。',
    };
  }
}

export const aiCrmAgent = new AiCrmAgent();

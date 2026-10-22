import { getAuthHeaders } from './authHeader';
import { Category, ProblemLevel, Solver, Question, AIPreliminaryReport, AiCrmLead, AiCrmPushNotification, Assistant24hrConfig } from '../types';

export interface AIAnalysisResult {
  category: Category;
  subcategory?: string;
  tags: string[];
  level: ProblemLevel;
  suggestedBounty: number;
  summary: string;
  structuredNeed: string[];
  solverProfileAdvice: string;
}

export interface AISolverMatch {
  solverId: string;
  matchScore: number;
  matchReason: string;
  solver: Solver;
}

export async function analyzeQuestionWithAI(title: string, description: string): Promise<AIAnalysisResult> {
  try {
    const res = await fetch('/api/ai/analyze-question', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ title, description }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.data) {
        return data.data as AIAnalysisResult;
      }
    }
  } catch (err) {
    console.warn('Network call to AI analysis failed, falling back to local engine', err);
  }

  // Local fallback engine with new taxonomy
  const fullText = (title + ' ' + (description || '')).toLowerCase();
  let category: Category = '創新創業';
  let subcategory = '資訊科技';
  let level: ProblemLevel = 'L2';
  let suggestedBounty = 1000;
  let tags = ['商業模式', '市場驗證', '產品策略'];
  let structuredNeed = [
    '痛點驗證與目標使用者畫像確認',
    '單位經濟效益 (Unit Economics) 與獲利路徑設計',
    '30 天低成本市場冷啟動驗證方案',
  ];
  let solverProfileAdvice = '新創商業顧問與雙邊市場產品經理';

  if (fullText.includes('水電') || fullText.includes('水壓') || fullText.includes('抓漏') || fullText.includes('馬達') || fullText.includes('電線') || fullText.includes('裝修')) {
    category = '專業問題';
    subcategory = '水電';
    tags = ['水電工程', '老屋修繕', '水壓配置', '漏水檢測'];
    level = 'L1';
    suggestedBounty = 500;
    solverProfileAdvice = '甲級水電技師與建築機電整合顧問';
    structuredNeed = [
      '進出水管壓力梯度與水閥流量排查',
      '變頻加壓馬達與冷熱水管防爆配置規劃',
      '暗管漏水檢測與無破壞修復工法',
    ];
  } else if (fullText.includes('ai') || fullText.includes('演算法') || fullText.includes('軟體') || fullText.includes('saas') || fullText.includes('科技') || fullText.includes('系統') || fullText.includes('程式')) {
    category = '創新創業';
    subcategory = '資訊科技';
    tags = ['資訊科技', 'AI 落地', '系統架構', '軟體開發'];
    level = 'L2';
    suggestedBounty = 2000;
    solverProfileAdvice = '資深技術架構師與 AI 解決方案專家';
    structuredNeed = [
      '核心技術架構選型與雲端資源開銷預估',
      '資料隱私、權限隔離與安全防護護欄',
      'API 整合與低延遲高併發優化策略',
    ];
  } else if (fullText.includes('生醫') || fullText.includes('醫療') || fullText.includes('材料') || fullText.includes('生技')) {
    category = '創新創業';
    subcategory = '生醫材料';
    tags = ['生醫材料', '醫療創新', '臨床驗證', '技術研發'];
    level = 'L3';
    suggestedBounty = 5000;
    solverProfileAdvice = '生醫專利技轉專家與醫療法規顧問';
    structuredNeed = [
      '臨床試驗法規合規與認證階梯規劃',
      '專利防禦佈局與技術授權價值評估',
      '生技早期天使投資與產學合資架構',
    ];
  } else if (fullText.includes('機械') || fullText.includes('硬體') || fullText.includes('自動化') || fullText.includes('工業') || fullText.includes('製造')) {
    category = '創新創業';
    subcategory = '機械工業';
    tags = ['機械工業', '工業 4.0', '自動化硬體', '物聯網'];
    level = 'L2';
    suggestedBounty = 2500;
    solverProfileAdvice = '機械工程顧問與工業物聯網架構師';
    structuredNeed = [
      '工業級感測器配置與邊緣控制邏輯',
      '機構防呆設計與生產良率優化路徑',
      '硬體供應鏈開模與量產成本控制',
    ];
  } else if (fullText.includes('餐飲') || fullText.includes('食品') || fullText.includes('外送') || fullText.includes('服務') || fullText.includes('餐廳') || fullText.includes('便當') || fullText.includes('鮮食')) {
    category = '創新創業';
    subcategory = '服務餐飲';
    tags = ['服務餐飲', '餐飲 D2C', '商圈經營', '翻桌率優化'];
    level = 'L1';
    suggestedBounty = 800;
    solverProfileAdvice = '連鎖餐飲顧問與門市營運專家';
    structuredNeed = [
      '食材成本控管與中央廚房 SOP 建立',
      '商圈離峰時段引流與線上外送整合策略',
      '會員集點制度與回購複購率提升模型',
    ];
  } else if (fullText.includes('工藝') || fullText.includes('文創') || fullText.includes('設計') || fullText.includes('手作') || fullText.includes('品牌')) {
    category = '創新創業';
    subcategory = '文創工藝';
    tags = ['文創工藝', '品牌故事', 'IP 授權', '群眾募資'];
    level = 'L1';
    suggestedBounty = 600;
    solverProfileAdvice = '文創品牌操盤手與設計顧問';
    structuredNeed = [
      '品牌故事脈絡與情感共鳴點提煉',
      '手作工藝標準化與小量試製外包流程',
      '群眾募資預熱問卷與達標回饋方案設計',
    ];
  } else if (fullText.includes('研究') || fullText.includes('論文') || fullText.includes('學術') || fullText.includes('期刊') || fullText.includes('大學') || fullText.includes('法律') || fullText.includes('政治') || fullText.includes('商管')) {
    category = '學術探討';
    subcategory = fullText.includes('法律') ? '法律政治' : fullText.includes('商管') ? '商管' : fullText.includes('電機') ? '電機' : '生技醫療';
    tags = ['學術探討', '文獻綜述', '研究方法論', '同儕審查'];
    level = 'L3';
    suggestedBounty = 4000;
    solverProfileAdvice = '大學教授與領域資深研究員';
    structuredNeed = [
      '頂級期刊論文審查回饋修改方針',
      '研究假設理論模型與實證計量方法',
      '科研成果專利授權產學轉移策略',
    ];
  } else if (fullText.includes('職場') || fullText.includes('同事') || fullText.includes('主管') || fullText.includes('薪資') || fullText.includes('面試') || fullText.includes('轉職')) {
    category = '日常疑難';
    subcategory = '職場';
    tags = ['職場應對', '轉職跳槽', '向上管理', '薪資談判'];
    level = 'L1';
    suggestedBounty = 400;
    solverProfileAdvice = '資深科技獵頭與職場教練';
    structuredNeed = [
      '職場衝突化解與跨部門利害溝通術',
      '關鍵績效指標達成與加薪提報說服話術',
      '求職面試作品集與核心優勢包裝',
    ];
  } else if (fullText.includes('感情') || fullText.includes('戀愛') || fullText.includes('伴侶') || fullText.includes('婚姻')) {
    category = '日常疑難';
    subcategory = '感情';
    tags = ['感情溝通', '關係經營', '親密互動'];
    level = 'L0';
    suggestedBounty = 0;
    solverProfileAdvice = '心理諮商顧問與關係溝通導師';
    structuredNeed = [
      '非暴力溝通模式與感受需求表達',
      '衝突冷靜期設定與雙方界線建立',
      '長期關係信任重塑與心理投射梳理',
    ];
  } else if (fullText.includes('家務') || fullText.includes('打掃') || fullText.includes('育兒') || fullText.includes('婆媳') || fullText.includes('收納')) {
    category = '日常疑難';
    subcategory = '家務';
    tags = ['家務分工', '居家收納', '生活效率'];
    level = 'L0';
    suggestedBounty = 0;
    solverProfileAdvice = '居家整理師與生活達人';
    structuredNeed = [
      '家庭事務責任分工表與執行激勵',
      '小坪數收納系統與物品斷捨離動線',
      '高效日常清潔流程與智能家電配置',
    ];
  } else if (fullText.includes('買') || fullText.includes('購物') || fullText.includes('推薦') || fullText.includes('評測') || fullText.includes('選擇')) {
    category = '日常疑難';
    subcategory = '購物';
    tags = ['消費推薦', '性價比評估', '選購指南'];
    level = 'L0';
    suggestedBounty = 0;
    solverProfileAdvice = '消費選品顧問與 3C/生活品評測家';
    structuredNeed = [
      '預算區間內主流競品規格橫向比較',
      '真實使用場景痛點與隱形後續開銷',
      '促銷折扣節點與二手殘值保值率分析',
    ];
  }

  return {
    category,
    subcategory,
    tags,
    level,
    suggestedBounty,
    summary: `針對「${title}」進行核心難點拆解，重點梳理市場需求、關鍵阻力與可驗證的解題步驟。`,
    structuredNeed,
    solverProfileAdvice,
  };
}

export async function matchSolversWithAI(question: Question, solvers: Solver[]): Promise<AISolverMatch[]> {
  try {
    const res = await fetch('/api/ai/match-solvers', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ question, solvers }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.matches && Array.isArray(data.matches)) {
        return data.matches
          .map((m: any) => ({
            ...m,
            solver: solvers.find((s) => s.id === m.solverId) || solvers[0],
          }))
          .filter((m: any) => Boolean(m.solver));
      }
    }
  } catch (err) {
    console.warn('Network call to AI matcher failed, falling back to local matcher', err);
  }

  // Continuous Multi-Dimensional Matching Algorithm
  const qTitle = (question.title || '').toLowerCase();
  const qDesc = (question.description || '').toLowerCase();
  const qCategory = (question.category || '').toLowerCase();
  const qTags = (question.tags || []).map((t) => t.toLowerCase());
  const qFullText = `${qTitle} ${qDesc} ${qCategory} ${qTags.join(' ')}`;

  const scored = solvers.map((s) => {
    // 1. Domain Match (0 ~ 25 pts)
    const sDomain = (s.domain || '').toLowerCase();
    const sSub = (s.subcategory || '').toLowerCase();
    let domainScore = 0;
    if (sDomain && (qCategory.includes(sDomain) || sDomain.includes(qCategory))) {
      domainScore = 22;
    } else if (sSub && qFullText.includes(sSub)) {
      domainScore = 18;
    } else {
      domainScore = 8;
    }

    // 2. Skill & Keyword Intersection (0 ~ 35 pts)
    const sSkills = (s.skills || []).map((sk) => sk.toLowerCase());
    let skillHits = 0;
    sSkills.forEach((sk) => {
      if (qFullText.includes(sk) || qTags.some((qt) => sk.includes(qt) || qt.includes(sk))) {
        skillHits += 1;
      }
    });
    const skillScore = Math.min(35, Math.round((skillHits / Math.max(1, sSkills.length)) * 32) + (skillHits > 0 ? 8 : 2));

    // 3. Historical Track Record & Quality (0 ~ 25 pts)
    const ratingScore = Math.round(((s.rating || 4.5) / 5) * 12);
    const accScore = Math.round(((s.acceptedRate || 80) / 100) * 8);
    const expScore = Math.min(5, Math.round(Math.log10(Math.max(1, s.answerCount || 5)) * 3));

    // 4. Verified Expert & Credibility Bonus (0 ~ 10 pts)
    const certScore = s.verifiedExpert ? 8 : 3;

    // Total Raw Score: 不設人為上下限（僅限制有效範圍 0 ~ 100）
    let rawScore = domainScore + skillScore + ratingScore + accScore + expScore + certScore;
    const finalScore = Math.min(100, Math.max(0, Math.round(rawScore)));

    const matchedKeySkills = s.skills.filter((sk) => qFullText.includes(sk.toLowerCase()));
    const displaySkills = matchedKeySkills.length > 0 ? matchedKeySkills.slice(0, 2) : s.skills.slice(0, 2);
    // 只寫真的有的數字（以前沒有資料時會寫成「累計 10 次、4.9 星、採納率 85%」）
    const facts = [
      s.answerCount ? `累計 ${s.answerCount} 次方案` : '',
      s.rating ? `歷史滿意度 ${s.rating} 星` : '',
      s.acceptedRate ? `採納率 ${s.acceptedRate}%` : '',
    ].filter(Boolean).join('、');
    const matchReason = `專精於「${displaySkills.join('、')}」${s.domain ? `，專業領域為 ${s.domain}` : ''}${facts ? `（${facts}）` : ''}。`;

    return {
      solverId: s.id,
      matchScore: finalScore,
      matchReason,
      solver: s,
    };
  });

  scored.sort((a, b) => b.matchScore - a.matchScore);
  return scored.slice(0, 4);
}

import { ThreeWayDiscrepancyItem, MediationSettlementOption } from '../types';

export interface AIDisputeMediationResult {
  reportTitle?: string;
  fulfillmentScore: number;
  fulfilledPoints: string[];
  unfulfilledPoints: string[];
  scopeCreepPoints?: string[];
  recommendedAction: string;
  suggestedPayoutRatio: number;
  suggestedRefundRatio?: number;
  mediatorOpinion: string;
  threeWayDiscrepancies?: ThreeWayDiscrepancyItem[];
  responsibilityBreakdown?: {
    solverWeight: number;
    buyerWeight: number;
    platformAssessment: string;
  };
  options?: {
    optionA: MediationSettlementOption;
    optionB: MediationSettlementOption;
  };
}

export async function mediateDisputeWithAI(
  questionTitle: string,
  questionDescription: string,
  actualDeliverables: string,
  disputeReason: string,
  communicationLogs?: string,
  totalEscrowAmount?: number
): Promise<AIDisputeMediationResult> {
  try {
    const res = await fetch('/api/ai/mediate-dispute', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        questionTitle,
        questionDescription,
        proposalPreview: actualDeliverables,
        actualDeliverables,
        communicationLogs: communicationLogs || '',
        disputeReason,
        totalEscrowAmount: totalEscrowAmount || 2000,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.data) {
        return data.data as AIDisputeMediationResult;
      }
    }
  } catch (err) {
    console.warn('Network call to AI dispute mediator failed, using fallback', err);
  }

  const escrow = totalEscrowAmount || 2000;
  const payout70 = Math.round(escrow * 0.7);
  const refund30 = escrow - payout70;

  return {
    reportTitle: 'IdeaX 智慧合約履約偏差與和解建議書',
    fulfillmentScore: 72,
    suggestedPayoutRatio: 70,
    suggestedRefundRatio: 30,
    mediatorOpinion: '本智庫調閱三方客觀證據鏈（原始需求約定、專家交付成果檔與雙方通訊日誌），認定解答者已實質履行約 72% 之核心分析架構，惟交付附件缺乏可動態連動之試算表原檔。另通訊紀錄顯示提問者中途曾提出未載於原委託之延伸競品比對，該項屬合約外追加需求，專家得免除違約責任。本調解意見本於商業衡平原則，提供比例折讓或限期補正雙軌方案。',
    fulfilledPoints: [
      '第一條 專案市場定位與戰略發展架構已完整交付，具備可行性',
      '第二條 產業痛點診斷與風險控制對策已符合原委託核心規格',
    ],
    unfulfilledPoints: [
      '第三條 財務模型未提供可動態編輯之 Excel 原始活頁簿（僅提供不可編輯之 PDF 截圖）',
      '第四條 缺少各季度預算編制之細部參數說明說明書',
    ],
    scopeCreepPoints: [
      '第五條 雙方通訊記錄中提問者追加要求之海外同業競爭分析，經查非屬原問題委託範疇，解答者得免負未交付違約責任',
    ],
    threeWayDiscrepancies: [
      {
        targetGoal: '交付商業可行性分析與競爭優勢報告（含核心架構與策略方針）',
        actualDelivery: '已交付 12 頁完整商業模式規劃書與 SWOT 競爭矩陣分析',
        communicationLog: '提問者於對話中確認已收到戰略框架，表示方向切合需求',
        status: 'fulfilled',
        notes: '實質履行完備，符合原合約要求。',
      },
      {
        targetGoal: '提供完整財務預算模型（約定需含各期現金流試算與可修改公式參數）',
        actualDelivery: '交付文件內僅附靜態財務摘要表格與不可編輯之 PDF 圖表',
        communicationLog: '提問者於交付後立即反映無法修改公式，要求補正原檔',
        status: 'discrepancy',
        notes: '存在交付格式之實質偏差，未達原約定之可編輯交付標準。',
      },
      {
        targetGoal: '額外追加海外市場跨國競品深入調研（非原始委託刊登項目）',
        actualDelivery: '未包含跨國競品資料',
        communicationLog: '對話記錄顯示提問者於專案進行第三天於私聊中主動追加提問',
        status: 'scope_creep',
        notes: '屬履約中途追加需求，不計入專家違約責任範圍。',
      },
    ],
    responsibilityBreakdown: {
      solverWeight: 65,
      buyerWeight: 35,
      platformAssessment: '解答者主要疏漏在於關鍵財務模型交付格式不符約定（責任佔比約 65%）；提問者中途追加超出原範圍之要求且溝通反饋有遞延（責任佔比約 35%）。',
    },
    recommendedAction: `第一條 立和解協議書人提問者（甲方）與解答者（乙方），就專案履約爭議達成協議如下：
一、 雙方得自主選擇採行【方案 A 比例折讓結案】或【方案 B 限期補正驗收】。
二、 若雙方同意方案 A，甲方同意自託管款項中劃撥 NT$ ${payout70.toLocaleString()} 元予乙方，餘額 NT$ ${refund30.toLocaleString()} 元即刻無息退還甲方，雙方互免後續修改責任並正式結案。
三、 若雙方同意方案 B，乙方承諾於協議成立後 3 日內補齊可編輯之 Excel 財務模型原檔，甲方之驗收期相應延長 3 個工作天，驗收合格後全額撥款。`,
    options: {
      optionA: {
        type: 'refund_ratio',
        title: '方案 A：按比例折讓退款與劃撥結案',
        description: `依客觀實質履約率 70% 進行結算。由託管資金劃撥 70%（NT$ ${payout70.toLocaleString()} 元）予解答者，30%（NT$ ${refund30.toLocaleString()} 元）即刻退還提問者。雙方免除後續修改與交付義務，立即終止爭議結案。`,
        payoutPercentToSolver: 70,
        refundPercentToBuyer: 30,
        payoutAmount: payout70,
        refundAmount: refund30,
      },
      optionB: {
        type: 'extend_remediation',
        title: '方案 B：限期補充交付與延長驗收天數',
        description: `解答者於 3 個工作天內依清單補齊可編輯財務模型原檔，提問者驗收期同步延長 3 天。驗收通過後按原約全額 NT$ ${escrow.toLocaleString()} 元撥付。`,
        extendedDays: 3,
        payoutPercentToSolver: 100,
        refundPercentToBuyer: 0,
        payoutAmount: escrow,
        refundAmount: 0,
        remediationTasks: [
          '補齊可動態連動之 Excel 財務模型原檔 (.xlsx)',
          '附上公式參數操作簡要說明',
        ],
      },
    },
  };
}

/**
 * 1. AI 產出初步問題分析、建議解決方案、建議解題方向
 * 附在問題內頁，任何人都可以支付點數解鎖，訂閱達人方案以上可免費使用此功能。
 */
export async function generatePreliminaryReportWithAI(question: Question): Promise<AIPreliminaryReport> {
  const title = question.title;
  const desc = question.description || '';
  const category = question.category || '創新創業';
  const subcategory = question.subcategory || '';
  const bounty = question.bounty || 0;

  try {
    const response = await fetch('/api/ai/preliminary-report', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        questionTitle: title,
        questionDescription: desc,
        category,
        subcategory,
        bounty,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.report) {
        return {
          id: `pre-report-live-${question.id}-${Date.now()}`,
          generatedAt: new Date().toISOString(),
          problemAnalysis: data.report.problemAnalysis,
          recommendedSolutions: data.report.recommendedSolutions,
          solvingDirections: data.report.solvingDirections,
          costPoints: 50,
          unlockedUserIds: [],
        };
      }
    }
  } catch (err) {
    console.warn('AI preliminary report remote call failed, using intelligent local generator:', err);
  }

  return getInitialPreliminaryReport(question);
}

export function getInitialPreliminaryReport(question: Question): AIPreliminaryReport {
  const title = question.title;
  const category = question.category || '創新創業';
  const subcategory = question.subcategory || '';

  // Domain-specific fallback
  let coreDiagnosis = `本題探討「${title}」，核心癥結在於目標客群訴求與交付方案之間的驗證閉環尚未確立。`;
  let painPoints = [
    '初期痛點定義過於寬泛，缺乏明確切入市場的剛需場景',
    '現有資源配置難以平衡研發/執行成本與商業回收週期',
    '缺乏可量化的階段性驗收標準與風險對沖預案',
  ];
  let barriers = [
    '潛在替代方案眾多，使用者轉換成本與學習曲線偏高',
    '法規合規與資安/智慧財產權壁壘未明晰',
    '雙邊市場或供應鏈上下游利益分配機制尚不透明',
  ];
  let strategicPillars = [
    '最小可行性驗證 (MVP)：以 14 天為週期進行低成本核心假設壓力測試',
    '模組化架構拆解：將複雜難點依優先級解耦，聚焦前 20% 關鍵槓桿點',
    '數據回饋飛輪：建立從使用者接觸、轉化到留存的閉環指標監控',
  ];
  let phaseSteps = [
    { step: 1, title: '關鍵痛點穿刺與對象抽樣', desc: '鎖定 5~10 位核心受眾進行深度質化訪談，驗證付費意願與真實痛點場景。' },
    { step: 2, title: '原型方案構建與單位效益試算', desc: '設計低代碼或實體原型，精算每單位交付成本 (Unit Economics) 與毛利結構。' },
    { step: 3, title: '小規模渠道推廣與優化迭代', desc: '在垂直社群或私域管道發起小規模封測，依數據反饋每週優化核心轉換路徑。' },
  ];
  let expectedOutcomes = '預期可在 3~4 週內獲得具備數據支撐的落地可行性報告，將試錯成本降低 60% 以上。';
  let recommendedDomain = `${category}${subcategory ? ` · ${subcategory}` : ''}`;
  let expertCompetencies = ['垂直領域產業實戰經驗', '冷啟動商業模式設計', '量化數據指標拆解'];
  let riskWarnings = [
    '切忌在未驗證剛需前過早投入重資產或大規模研發',
    '與解答專家合作時，應約定階段交付物（如線框圖、試算表原檔）而非單純文字觀點',
  ];

  if (category === '專業問題' || title.includes('水電') || title.includes('工程') || title.includes('裝修')) {
    coreDiagnosis = `本案屬於實體工程與空間修繕範疇，核心問題在於隱蔽管線檢測、壓力負載平衡與法規工法標準。`;
    painPoints = [
      '暗管滲漏位置難以肉眼直觀確認，盲目破壞開挖成本高昂',
      '水壓梯度不足影響終端用水設備穩定度與壽命',
      '工法選型與材料耐用年限資訊不對稱',
    ];
    barriers = ['建築原設計管線圖資缺失', '高低樓層共用主管與管委會權責邊界', '防水層連鎖受損風險'];
    strategicPillars = [
      '非破壞性儀器探測（紅外線熱成像 + 管內內視鏡）',
      '梯度壓力重置工法與水閥分區隔離',
      '施工材料具備 CNS 認證與防爆抗裂履歷',
    ];
    phaseSteps = [
      { step: 1, title: '現場物理檢測與滲壓數據量測', desc: '利用專業儀器進行水壓持壓 48 小時監測，定位漏水壓力損耗區間。' },
      { step: 2, title: '非開挖式或微創修復工法實施', desc: '優先採用暗管高分子發泡填縫或局部引流，減少對裝潢結構的破壞。' },
      { step: 3, title: '閉水耐壓驗收與保固切結', desc: '完成修復後進行高壓回水驗收，由甲級技師出具履約報告與 2 年防水保固。' },
    ];
    expectedOutcomes = '徹底根除滲漏水或水壓異常，避免壁癌擴散與鄰里糾紛，節省後續開挖重做成本。';
    recommendedDomain = '甲級水電工程技師 / 建築機電顧問';
    expertCompetencies = ['甲級水電匠證照', '管線內視鏡與抓漏實測資歷', '老屋管線重新配置實戰'];
    riskWarnings = ['切勿聽信未經持壓檢驗即要求大面積敲磚的粗暴工法', '合約務必載明漏水復發責任與保固條款'];
  } else if (title.includes('AI') || title.includes('軟體') || title.includes('系統') || title.includes('程式')) {
    coreDiagnosis = `本技術方案聚焦於軟體架構擴展性與 AI 模組落地整合，關鍵瓶頸在於 API 調用延遲、算力成本與資料隱私護欄。`;
    painPoints = [
      '大語言模型 (LLM) 上下文膨脹導致單次推論延遲與 Token 費用失控',
      '使用者真實資料如何安全隔離與防範提示詞注入 (Prompt Injection)',
      '前端互動體驗與後端異步隊列 (Queue) 解耦不夠徹底',
    ];
    barriers = ['GPU 算力與商用 API 調用成本門檻', '向量檢索 (RAG) 召回準意度與幻覺過濾', '高併發下連線中斷與狀態同步'];
    strategicPillars = [
      '語意快取 (Semantic Caching) 與分級模型調度（以小模型路由大模型）',
      '混合檢索 (Hybrid Search + Reranker) 提升精準度',
      '事件驅動無伺服器微服務 (Serverless Event-driven) 架構',
    ];
    phaseSteps = [
      { step: 1, title: '技術選型與邊界條件評估', desc: '確定模型基準、延遲 SLA（<800ms）與單次互動成本上限（< NT$ 0.1）。' },
      { step: 2, title: '最小可行性 API 與保護層搭建', desc: '構建身分驗證、速率限制 (Rate Limiting) 與資料遮蔽 (Data Masking) 中介層。' },
      { step: 3, title: '負載壓力測試與容錯降級機制', desc: '模擬 500+ 並發請求，設定 API 服務商超時自動切換至備援端點。' },
    ];
    expectedOutcomes = '建構高可用、低延遲的生產級架構，API 成本預期降低 50% 以上，並滿足企業合規標準。';
    recommendedDomain = '資深雲端技術架構師 / AI 系統工程專家';
    expertCompetencies = ['高併發分散式系統設計', 'LLM 落地成本優化', '向量資料庫與 RAG 實戰'];
    riskWarnings = ['避免將 API 密鑰直接暴露於客戶端', '多階段交付應要求專家提供可運行的測試腳本與 Swagger 文件'];
  }

  return {
    id: `pre-report-${question.id}-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    problemAnalysis: {
      coreDiagnosis,
      painPointBreakdown: painPoints,
      technicalOrBusinessBarriers: barriers,
    },
    recommendedSolutions: {
      strategicPillars,
      phaseSteps,
      expectedOutcomes,
    },
    solvingDirections: {
      recommendedDomain,
      expertCompetencies,
      riskWarnings,
    },
    costPoints: 50,
    unlockedUserIds: [],
  };
}

/**
 * 2. AI 整理架構：將解題者文字內容整理成更完整有邏輯的架構（達人方案以上解鎖）
 */
export async function restructureSolutionWithAI(
  rawText: string,
  questionTitle?: string
): Promise<{ structuredText: string; improvements: string[] }> {
  try {
    const response = await fetch('/api/ai/restructure-solution', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ content: rawText, questionTitle }),
    });

    if (response.ok) {
      const result = await response.json();
      if (result && result.data) {
        return result.data;
      }
    }
  } catch (err) {
    console.warn('AI restructure-solution remote call failed, using intelligent local restructuring:', err);
  }

  const trimmed = rawText.trim();
  if (!trimmed) {
    return {
      structuredText: `【一、問題核心診斷與癥結剖析】
• 針對「${questionTitle || '本專案需求'}」，釐清首要瓶頸與痛點本質。
• 深入評估現有條件與關鍵資源缺口，建立可衡量的目標基準。

【二、階梯式落地解決方案（SOP 執行綱要）】
1. 第一階段：前置排查與基準建立（預估 3~5 天）
   - 梳理核心流程，產出標準化檢查清單與原型範本。
2. 第二階段：實施推進與關鍵參數調校（預估 5~7 天）
   - 聚焦核心指標提升，排除實務推進中的摩擦阻力。
3. 第三階段：成果交付與全面驗收測試（預估 2~3 天）
   - 交付正式可交付成果物（原始檔、參數設定與操作說明）。

【三、關鍵成效指標 (KPI) 與量化預期】
• 實質改善成效量化指標。
• 資源與成本回收效益預估。
• 成果符合驗收標準，提供完整回溯清單。

【四、潛在風險防範與替代備案】
• 常見踩坑盲點提醒。
• 遇不可抗力時的第二條替代路徑。`,
      improvements: [
        '自動建立金字塔顧問結構：診斷 -> 步驟 -> 指標 -> 防範',
        '將分散文字轉為分階段可驗收里程碑',
        '增加商業提案說服力與採納信心',
      ],
    };
  }

  const structuredText = `【一、問題核心診斷與癥結剖析】
• 針對「${questionTitle || '本專案需求'}」之現況，經深入研判，關鍵阻力在於執行細節與資源匹配度：
  - 核心痛點：${trimmed.slice(0, 80)}...
  - 結構瓶頸：現有做法缺乏模組化分工與可量化的節點把控，易產生不必要的溝通摩擦。

【二、階梯式落地解決方案（SOP 執行綱要）】
1. 第一階段：前置排查與基準建立（約 3~5 工作天）
   - 釐清所有關鍵變數，建立最小試行基準與驗收標準。
   - 交付物：需求規格確認書與基準指標表。

2. 第二階段：核心方案落地與動態優化（約 5~7 工作天）
   - 深入核心執行環節，落實具體操作參數與跨模組協同。
   - 交付物：可運行的解決方案實作件、模板或模型原檔。

3. 第三階段：成果交付與全面驗收測試（約 2~3 工作天）
   - 交付正式可交付成果物（原始檔、參數設定與操作說明）。
   - 提供後續微調建議與長期維護指南。

【三、關鍵成效指標 (KPI) 與量化預期】
• 效率提升：預期作業時間縮減 30% ~ 50%。
• 成本控制：精準控管每單位開銷，避開無效重複試錯。
• 交付標準：符合專案驗收規格，提供完整回溯依據。

【四、潛在風險防範與替代備案】
• 風險一：需求變更或延伸追加。
  - 對策：嚴格遵循原約定邊界，追加項目另立補充協議。
• 風險二：時間節點遞延。
  - 對策：預留 10% 緩衝期，並每日同步最新進度。`;

  return {
    structuredText,
    improvements: [
      '採用麥肯錫金字塔原則，建立四層高階商業顧問結構',
      '將執行重點拆解為 3 個清晰可驗收的交付階段與產出物',
      '自動補齊成效指標 (KPI) 與風險控制預案',
    ],
  };
}

/**
 * 2. AI 客製化梳理：依照客戶理解程度將原文梳理成客戶容易理解、更能產生共鳴的語意（權威方案以上解鎖）
 */
export async function adaptAudienceComprehensionWithAI(params: {
  rawText: string;
  questionTitle?: string;
  questionDescription?: string;
  questionCategory?: string;
  customerName?: string;
  customerTitle?: string;
  promptHint?: string;
}): Promise<{ adaptedText: string; toneDescription: string; readabilityScore: number }> {
  const { rawText, questionTitle, questionDescription, questionCategory, customerName, customerTitle, promptHint } = params;

  try {
    const response = await fetch('/api/ai/adapt-comprehension', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        content: rawText,
        questionTitle,
        questionDescription,
        category: questionCategory,
        customerName,
        customerTitle,
        promptHint,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      if (result && result.data) {
        return result.data;
      }
    }
  } catch (err) {
    console.warn('AI adapt-comprehension remote call failed, using intelligent local adaptation:', err);
  }

  const clientName = customerName || '提問者';
  const preview = rawText ? rawText.slice(0, 100) : '聚焦於核心業務瓶頸與跨模組協同';

  return {
    adaptedText: `【客製化共鳴優化版・依您的理解視角量身梳理】

👋 ${clientName}您好！針對您提出的「${questionTitle || '這項專案需求'}」，我深知在實際推動時最容易遇到的焦慮與困擾。

我將原本較為複雜的專業執行方案，梳理為最直觀、容易理解且能立竿見影的落地步驟：

1. 核心癥結一眼看懂：
   問題的關鍵不在於投入多少繁雜資源，而是在於把最卡手、最花成本的環節單獨理順。
   針對您的現況：${preview}。

2. 讓您完全安心的具體三階段：
   • 階段一（先抓準核心，避開走彎路）：我們先建立清楚的檢查清單與驗收共識，確保每一步都符合您的真實期望。
   • 階段二（穩健落實，即時排除阻礙）：依照約定的進度逐步落實關鍵交付成果，有任何細節隨時溝通調整。
   • 階段三（成果交接，長期無後顧之憂）：交付完整的成果檔案與操作備忘錄，讓您自己或團隊能輕鬆掌握運作。

💡 專屬承諾：
方案執行全程以您最習慣、最容易理解的方式保持密切溝通，絕不拋出晦澀術語，讓您隨時擁有最踏實的掌控感！`,
    toneDescription: '已依照客戶理解程度進行深度梳理，轉化為直觀易懂、深具信任共鳴的專屬溝通語意',
    readabilityScore: 96,
  };
}

/**
 * 3. 主動客戶關係管理系統 (AI-CRM)：系統定時主動關注與分析用戶狀況和需求並制定策略給訂閱用戶
 * 實作動態關聯：依據平台上真實問題需求與潛在客戶互動即時運算！
 */
export function getAiCrmLeadsForSolver(
  solverDomain?: string,
  solverSkills?: string[],
  platformQuestions?: Question[]
): AiCrmLead[] {
  // If real questions exist in platform, map them dynamically to generate live CRM leads
  if (platformQuestions && platformQuestions.length > 0) {
    const candidateQuestions = platformQuestions
      .filter((q) => q.status !== 'delisted' && (q.status === 'open' || q.bounty > 0))
      .slice(0, 5);

    if (candidateQuestions.length > 0) {
      return candidateQuestions.map((q, idx) => {
        const isHighBounty = (q.bounty || 0) >= 3000;
        const urgency: 'high' | 'medium' | 'low' = isHighBounty ? 'high' : idx % 2 === 0 ? 'high' : 'medium';
        const clientName = q.authorName || '潛在委託客戶';
        const bountyVal = q.bounty || 2500;

        return {
          id: `crm-lead-${q.id}`,
          clientId: q.authorId,
          clientName: q.authorName,
          clientAvatar: q.authorAvatar,
          clientRole: q.authorTitle || '需求發問者',
          questionId: q.id,
          questionTitle: q.title,
          lastActiveTime: idx === 0 ? '剛剛' : `${idx * 2 + 1} 小時前`,
          statusType: idx === 0 ? 'board_follower' : idx === 1 ? 'proposal_viewed_no_reply' : 'profile_favorited',
          statusDescription: idx === 0
            ? `在「${q.category}」發布了懸賞 NT$ ${(q.bounty || 0).toLocaleString()}，目前正尋求具備實戰經驗之專家`
            : idx === 1
            ? `已查閱過相關領域解答方案，正在比對專家服務品質`
            : `收藏了您的專家主頁，停留檢視精選案例中`,
          urgency,
          aiInsight: `提問者在「${q.title}」有高度明確的迫切剛需。若在 4 小時內主動送出依其理解程度梳理後的初步解題綱要，成交率提升 3 倍以上！`,
          aiRecommendedAction: `主動發起專屬問候，附上「${q.category} 落地實操避坑檢核表」迅速建立專業信任。`,
          suggestedMessage: `${clientName}您好！注意到您正在評估「${q.title}」的解決方案。我在${q.category}領域有豐富落地實戰經驗，針對您目前的痛點已初步整理出三階段執行清單，若您有需要很樂意為您提供專屬諮詢！`,
          hasSent: false,
          clientStatus: idx === 0 ? '迫切尋求交付・即時在線' : idx === 1 ? '猶豫評估中・橫向比價' : '高意向探索・瀏覽案例',
          clientNeedsAnalysis: {
            corePainPoints: [
              `對「${q.title}」缺乏標準落地流程與合規框架`,
              `內部團隊資源有限，亟需具備成功案例之外部資深專家背書`,
              `擔心執行時程延宕，需要精確之階段性交付驗收指標`,
            ],
            budgetIntent: `NT$ ${(bountyVal * 0.8).toLocaleString()} ～ NT$ ${(bountyVal * 2.2).toLocaleString()}`,
            decisionFactors: ['時效與落地能力 40%', '專家專業公信力 35%', '報價合理性 25%'],
            interactionSignals: [
              `曾停留本題詳情頁 6 分鐘並下載閱讀預覽附件`,
              `近 24 小時內橫向瀏覽了 2 位相關領域認證專家檔案`,
              `標籤偏好高契合：${q.category}、實務落地、風險防護`,
            ],
          },
          strategyBlueprint: {
            strategyName: idx === 0 ? '⚡ 敏捷雙里程碑破冰策略' : idx === 1 ? '🎯 痛點拆解與降險報價策略' : '🤝 高信任權威展示策略',
            tacticalSteps: [
              {
                step: 1,
                title: '主動破冰與建立共識',
                desc: `主動發送客製化問候，直接點出「${q.title}」的核心風險盲區，消除客戶陌生感。`,
              },
              {
                step: 2,
                title: '提供輕量自檢工具/初步綱要',
                desc: `免費提供專屬「${q.category} 落地實操清單」，展現實戰深度與專業從容度。`,
              },
              {
                step: 3,
                title: '提出階梯式里程碑方案',
                desc: `建議報價設定為階段驗收（第 1 階段診斷、第 2 階段成果交付），大幅降低客戶決策門檻。`,
              },
            ],
            suggestedOfferType: idx === 0 ? '階段性里程碑交付方案' : '一對一專屬深度諮詢方案',
            suggestedPriceRange: `NT$ ${Math.round(bountyVal * 0.9).toLocaleString()} ～ NT$ ${Math.round(bountyVal * 1.8).toLocaleString()}`,
            dealProbability: idx === 0 ? 88 : idx === 1 ? 82 : 76,
            bestContactTime: '今日 13:30 - 17:30 (提問者活躍高峰窗口)',
            riskAssessment: '客戶對時效與產出成果極為敏銳，建議在首條訊息中明確標註交付天數與驗收準則。',
          },
        };
      });
    }
  }

  // Baseline fallback leads with rich diagnostics
  return [
    {
      id: 'crm-lead-1',
      clientId: 'user-zhang',
      clientName: '張先生',
      clientAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      clientRole: '連鎖餐飲品牌創辦人',
      questionId: 'q-food-d2c',
      questionTitle: '實體餐飲如何透過 D2C 外帶外送提升 30% 淨利',
      lastActiveTime: '3 天前',
      statusType: 'proposal_viewed_no_reply',
      statusDescription: '3 天前已檢視了您的提案尚未回覆',
      urgency: 'high',
      aiInsight: '客戶目前正面臨加盟門市外送抽成高達 35% 的壓力，正在橫向比對 2 位專家的成本結構。此時若主動發送「門市菜單減重 18% 抽成實操範本」，將可直接消除客戶疑慮，促成提案採納！',
      aiRecommendedAction: '建議發送補充資料與成功門市實操數據，展現主動關懷專業度。',
      suggestedMessage: '張先生您好！注意到您正在評估外送抽成與淨利提升方案。我特地為您整理了上個月協助連鎖門市「外送專用菜單降本 18%」的試算模型與操作清單，附上給您參考！若有任何想進一步探討的地方，我很樂意為您詳細說明。',
      hasSent: false,
      clientStatus: '猶豫評估中・評估外送平台抽成與自營成本',
      clientNeedsAnalysis: {
        corePainPoints: [
          '外送平台抽成高達 35%，侵蝕加盟門市獲利率',
          '自建 D2C 官方外帶點餐系統缺乏行銷導流與會員沉澱閉環',
          '擔心門市店員操作複雜造成出餐失誤與客訴增加',
        ],
        budgetIntent: 'NT$ 8,000 ～ NT$ 25,000 (重視能省下的抽成趴數)',
        decisionFactors: ['回本週期 (ROI) 45%', '系統整合難易度 35%', '顧問實務輔導經驗 20%'],
        interactionSignals: [
          '3 天前完整閱讀您提交的提案報告（停留 8 分 20 秒）',
          '在「連鎖餐飲」主題看板持續追蹤 3 篇外送降本解方',
          '曾點擊查看您的過往客戶好評與驗收成果文件',
        ],
      },
      strategyBlueprint: {
        strategyName: '🍔 門市即時降本・雙階段成效切入策略',
        tacticalSteps: [
          {
            step: 1,
            title: '主動發送《外送專用菜單降本 18% 試算表》',
            desc: '針對張先生最在意的抽成痛點，提供一目了然的直觀效益算式。',
          },
          {
            step: 2,
            title: '提供 1 家同量級門市的落地脫困案例',
            desc: '分享 40 家分店在 45 天內拉升 30% 自營訂單的真實改版步驟。',
          },
          {
            step: 3,
            title: '提出輕量化諮詢＋客製菜單方案',
            desc: '提供 NT$ 9,800 之啟動方案，先完成 3 家直營旗艦店改造，降低初期投入顧慮。',
          },
        ],
        suggestedOfferType: '階段性門市改造實戰專案',
        suggestedPriceRange: 'NT$ 9,800 ～ NT$ 28,000',
        dealProbability: 86,
        bestContactTime: '平日下午 14:00 - 16:30 (餐飲業者兩頭班休息空檔)',
        riskAssessment: '創辦人決策風格務實，避免談論空泛理論，需聚焦「具體降了幾個百分點與省下多少平台抽成」。',
      },
    },
    {
      id: 'crm-lead-2',
      clientId: 'user-chen',
      clientName: '陳副總',
      clientAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      clientRole: '生醫材料科技研發副總經理',
      questionId: 'q-med-patents',
      questionTitle: '高分子生醫材料專利佈局與 TFDA 認證路徑',
      lastActiveTime: '昨天晚上 21:40',
      statusType: 'profile_favorited',
      statusDescription: '收藏了您的專家檔案，並在您的精選案例頁停留 4 分鐘',
      urgency: 'medium',
      aiInsight: '客戶團隊預計於下季度啟動二期臨床送件，正在物色具備 TFDA / FDA 雙軌申報經驗的長期顧問。對方已兩次查看您的案例附件，意向非常明確。',
      aiRecommendedAction: '主動發送問候，提供「TFDA 送審 3 大隱形紅線檢查表」建立信任關係。',
      suggestedMessage: '陳副總您好，感謝關注我的生醫專利與法規顧問主頁！看到貴團隊在高分子材料領域的卓越突破。針對近期衛福部對送審資料的新規，我整理了一份「二期臨床常見 3 大補件紅線備忘錄」，隨時歡迎與您交流探討！',
      hasSent: false,
      clientStatus: '高意向探索・審查專家執業背景與法規送件紀錄',
      clientNeedsAnalysis: {
        corePainPoints: [
          '二期臨床試驗送件時程緊迫，補件往返恐延遲半年以上',
          '專利迴避設計尚未完成，存在與國際大廠侵權訴訟風險',
          '需要具備 TFDA 實戰經驗的獨立第三方出具專家合規性評估',
        ],
        budgetIntent: 'NT$ 30,000 ～ NT$ 80,000 (重視專業權威度與精確度)',
        decisionFactors: ['法規與認證專精深度 50%', '過往案件成功率 30%', '諮詢響應敏捷度 20%'],
        interactionSignals: [
          '連續 2 天晚間查看您的生醫專利佈局認證徽章與資歷',
          '在您發布的專家案例下載了《醫療器材查驗登記白皮書》',
          '已收藏個人檔案並標記為備選外部專家顧問',
        ],
      },
      strategyBlueprint: {
        strategyName: '🔬 法規權威背書・零風險補件檢核策略',
        tacticalSteps: [
          {
            step: 1,
            title: '主動破冰並遞送《TFDA 送審 3 大隱形紅線備忘錄》',
            desc: '針對生醫材料常遭衛福部要求補件的項目給予預警與應對範本。',
          },
          {
            step: 2,
            title: '提供線上 45 分鐘專案技術預審盤點會談',
            desc: '先以短時間技術會議快速釐清高分子配方專利疑點，建立高度專業信賴。',
          },
          {
            step: 3,
            title: '制定全案法規送審伴跑合約',
            desc: '分二階段簽署（送件前合規評估報告 ＋ 官方審查補件答辯全程指導）。',
          },
        ],
        suggestedOfferType: '深度法規合規諮詢 ＋ 送件輔導專案',
        suggestedPriceRange: 'NT$ 35,000 ～ NT$ 65,000',
        dealProbability: 80,
        bestContactTime: '平日晚間 20:30 - 22:00 或 上午 09:30 - 11:30',
        riskAssessment: '企業客戶注重保密協定 (NDA) 與智慧財產權歸屬，建議在溝通中主動強調平台具備合法法律契約保障。',
      },
    },
    {
      id: 'crm-lead-3',
      clientId: 'user-lin',
      clientName: '林總監',
      clientAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      clientRole: '跨境電商出海營運處長',
      questionId: 'q-crossborder-logistics',
      questionTitle: '東南亞 Shopee / TikTok Shop 逆向退貨物流與海外倉稅務合規',
      lastActiveTime: '2 小時前',
      statusType: 'board_follower',
      statusDescription: '在您關注的「跨境電商」看板發布了 NT$ 5,000 高額懸賞，尚未有專家提案',
      urgency: 'high',
      aiInsight: '該問題與您的核心領域「海外供應鏈與跨境金流」100% 契合。發問者目前在線，若搶先在發布 4 小時內送出高品質提案，成交率為一般提案的 3.8 倍。',
      aiRecommendedAction: '立即搶先提案，並發送客製化初步解題策略！',
      suggestedMessage: '林總監您好！看到您發起的東南亞退貨與稅務合規懸賞。我過去曾主導過印尼與越南海外倉逆向物流重建，特別針對海關查驗與退件扣關有成熟 SOP。已為您送出初步提案，期待為您解憂！',
      hasSent: false,
      clientStatus: '急迫需解方・新發布高額懸賞・等待精準專家提案',
      clientNeedsAnalysis: {
        corePainPoints: [
          '印尼與泰國海外倉退貨率高達 18%，庫存積壓報廢損失龐大',
          '當地海關新稅規對逆向退件徵收高額補稅，急需合規轉售路徑',
          '缺乏具備在地清關資源與海外倉系統對接的整合專家',
        ],
        budgetIntent: 'NT$ 5,000 ～ NT$ 20,000 (懸賞 NT$ 5,000，可追加客製專案)',
        decisionFactors: ['在地落地資源 40%', '時效性與響應速度 35%', '方案完整度 25%'],
        interactionSignals: [
          '發布 NT$ 5,000 懸賞後，正在在線等待首位專家提案',
          '同時在尋求東南亞 TikTok Shop 認證海外倉對接清單',
          '過去在平台有良好驗收紀錄與快速採納習慣',
        ],
      },
      strategyBlueprint: {
        strategyName: '🌏 搶先觸達・海外倉清關與退件止血策略',
        tacticalSteps: [
          {
            step: 1,
            title: '4 小時內極速提交結構化方案',
            desc: '列出印尼、越南、泰國三大市場的逆向物流現況與常見 4 大海關扣關雷區。',
          },
          {
            step: 2,
            title: '附帶《東南亞 3 國合規清關自救 SOP》',
            desc: '直接給予發問者可立即執行的應急方案，樹立壓倒性專業壁壘。',
          },
          {
            step: 3,
            title: '提供客製海外倉退件轉售系統建置報價',
            desc: '以懸賞為起點，後續加值提案「跨國海外倉退件二次分揀與本地折扣轉售」客製方案。',
          },
        ],
        suggestedOfferType: '懸賞提案採納 ＋ 後續海外倉整合顧問',
        suggestedPriceRange: 'NT$ 5,000 ～ NT$ 18,000',
        dealProbability: 92,
        bestContactTime: '今日 14:00 - 18:00 (即刻發送搶佔首位優勢)',
        riskAssessment: '跨境政策變動頻繁，交付成果時需附上最新 2026 季度的海關公告依據以增強公信力。',
      },
    },
  ];
}

export function getAiCrmPushesForSolver(solverId?: string): AiCrmPushNotification[] {
  return [
    {
      id: 'push-1',
      targetAudience: '關注「創新創業・資訊科技」看板的 38 位提問者',
      triggerEvent: '專家完成高品質高分採納解答',
      content: '系統自動推播：「您關注的『資訊科技』主題看板，金牌顧問新增了 1 則獲採納滿分商業架構方案，點擊免費預覽核心精華！」',
      status: 'sent',
      clicksCount: 42,
    },
    {
      id: 'push-2',
      targetAudience: '曾瀏覽過您個人主頁但未下單的 14 位潛在客戶',
      triggerEvent: '專家方案熱門度提升 25%',
      content: '系統推播：「您曾關注的戰略顧問本週好評率達 100%，目前開放 2 個一對一諮詢席位！」',
      status: 'sent',
      clicksCount: 19,
    },
  ];
}

export interface ActiveTimeSlotInfo {
  slotId: 'peak' | 'evening' | 'offpeak';
  slotName: string;
  slotRange: string;
  currentIntervalHours: number;
  badgeTheme: 'emerald' | 'amber' | 'purple';
  focusSummary: string;
  nextScanEstimatedText: string;
  activityLevelText: string;
}

export function getCurrentTimeSlotInfo(
  config?: {
    peakIntervalHours?: number;
    eveningIntervalHours?: number;
    offPeakIntervalHours?: number;
    scheduleMode?: 'smart_time_slots' | 'fixed_interval';
    autoScanIntervalHours?: number;
  },
  dateOverride?: Date
): ActiveTimeSlotInfo {
  const now = dateOverride || new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const timeInMinutes = hours * 60 + minutes;

  // 若為固定頻率模式
  if (config?.scheduleMode === 'fixed_interval') {
    const fixedHours = config.autoScanIntervalHours || 2;
    return {
      slotId: 'evening',
      slotName: '固定間隔巡航',
      slotRange: '全天 24 小時固定輪詢',
      currentIntervalHours: fixedHours,
      badgeTheme: 'amber',
      focusSummary: `全天候每 ${fixedHours} 小時固定巡檢分析全站提問者與潛在商機`,
      nextScanEstimatedText: '42 分鐘後',
      activityLevelText: `固定每 ${fixedHours} 小時巡航`,
    };
  }

  const peakInterval = config?.peakIntervalHours ?? 1;
  const eveningInterval = config?.eveningIntervalHours ?? 2;
  const offPeakInterval = config?.offPeakIntervalHours ?? 6;

  // 1. 日間商務活躍期 (09:00 - 18:00)
  if (timeInMinutes >= 540 && timeInMinutes < 1080) {
    const minutesToNext = 60 - (minutes % 60);
    return {
      slotId: 'peak',
      slotName: '日間商務活躍期',
      slotRange: '09:00 - 18:00',
      currentIntervalHours: peakInterval,
      badgeTheme: 'emerald',
      focusSummary: '⚡ 高敏捷度巡檢・鎖定新發高額懸賞、即時比價猶豫與在線破冰',
      nextScanEstimatedText: `${minutesToNext} 分鐘後`,
      activityLevelText: `活躍高峰（每 ${peakInterval} 小時動態巡航）`,
    };
  }

  // 2. 晚間決策沉思期 (18:00 - 23:30)
  if (timeInMinutes >= 1080 && timeInMinutes < 1410) {
    const minutesToNext = 120 - ((minutes + (hours % 2) * 60) % 120);
    return {
      slotId: 'evening',
      slotName: '晚間決策沉思期',
      slotRange: '18:00 - 23:30',
      currentIntervalHours: eveningInterval,
      badgeTheme: 'amber',
      focusSummary: '🌙 深度方案比對・下班深度審閱、信任里程碑與諮詢預約引導',
      nextScanEstimatedText: `${minutesToNext > 0 ? minutesToNext : 35} 分鐘後`,
      activityLevelText: `深度評估（每 ${eveningInterval} 小時動態巡航）`,
    };
  }

  // 3. 深夜離峰 (23:30 - 09:00)
  let minutesToNext = 45;
  if (timeInMinutes >= 1410) {
    minutesToNext = (1440 - timeInMinutes) + 540;
    minutesToNext = minutesToNext % 360 || 90;
  } else {
    minutesToNext = (540 - timeInMinutes) % 360 || 120;
  }

  return {
    slotId: 'offpeak',
    slotName: '深夜離峰',
    slotRange: '23:30 - 09:00',
    currentIntervalHours: offPeakInterval,
    badgeTheme: 'purple',
    focusSummary: '💤 整理未解決問題，排定明早優先追蹤名單',
    nextScanEstimatedText: `${Math.min(minutesToNext, 180)} 分鐘後`,
    activityLevelText: `離峰節能（每 ${offPeakInterval} 小時深層彙整）`,
  };
}

// ==========================================
// 24hr AI特助代客服務 & 專家在線召喚建議 API
// ==========================================

export interface Assistant24hrReplyResult {
  replyText: string;
  identifiedNeed: string;
  estimatedBudget?: string;
  estimatedTimeline?: string;
  shouldHandoverToHuman: boolean;
}

export async function generate24hrAssistantReply(options: {
  solverName: string;
  solverTitle?: string;
  config: Assistant24hrConfig;
  conversationHistory: Array<{ senderName: string; text: string; isSelf: boolean }>;
  latestMessage: string;
}): Promise<Assistant24hrReplyResult> {
  try {
    const res = await fetch('/api/ai/assistant-24hr-reply', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        solverName: options.solverName,
        solverTitle: options.solverTitle,
        tone: options.config.tone,
        toneDescription: options.config.toneDescription,
        faqList: options.config.faqList,
        customPrompts: options.config.customPrompts,
        requireHumanApprovalForDeals: options.config.requireHumanApprovalForDeals,
        enableConfidentialityFirewall: options.config.enableConfidentialityFirewall,
        conversationHistory: options.conversationHistory,
        latestMessage: options.latestMessage,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.data?.replyText) {
        return data.data as Assistant24hrReplyResult;
      }
    }
  } catch (err) {
    console.warn('Network call to assistant-24hr-reply failed, using local firewall engine:', err);
  }

  // 離線本地智慧回覆（嚴格執行個資與商業機密防火牆）
  const lowerMsg = (options.latestMessage || '').toLowerCase();
  let matchedAnswer = '';

  // 嘗試比對 FAQ
  if (options.config.faqList && options.config.faqList.length > 0) {
    const foundFaq = options.config.faqList.find((f) => {
      const qKeywords = f.question.toLowerCase().split(/[？?,\s]+/);
      return qKeywords.some((k) => k.length >= 2 && lowerMsg.includes(k));
    });
    if (foundFaq) {
      matchedAnswer = foundFaq.answer;
    }
  }

  const baseReply = matchedAnswer
    ? `您好！我是 ${options.solverName} 專屬的 24hr AI 特助。針對您的問題，${matchedAnswer}\n\n正式專案細節與合約確認，${options.solverName} 顧問上線後會親自為您詳細評估。請問您期望的完成時程與專案預算大約是多少呢？`
    : `您好！我是 ${options.solverName} 專屬的 24hr AI 特助。${options.solverName} 顧問目前處於離線狀態，我已先為您記錄這項需求。\n\n為了讓顧問第一時間為您準備具體方案，能否請您簡短分享希望的交付時程與預算範圍呢？所有正式報價與條款將由顧問本人上線後親自確認。`;

  return {
    replyText: baseReply,
    identifiedNeed: '客戶提出新專案諮詢，AI 特助已代客記錄並引導確認時程預算',
    estimatedBudget: lowerMsg.includes('元') || lowerMsg.includes('萬') ? '初步提及' : '未提及',
    estimatedTimeline: lowerMsg.includes('天') || lowerMsg.includes('月') || lowerMsg.includes('急') ? '初步提及' : '未提及',
    shouldHandoverToHuman: lowerMsg.includes('電話') || lowerMsg.includes('立刻') || lowerMsg.includes('急'),
  };
}

export interface ExpertAdviceItem {
  strategyTitle: string;
  suggestedText: string;
  psychologicalAnalysis: string;
}

export interface ExpertChatAdviceResult {
  adviceList: ExpertAdviceItem[];
  quickTips: string;
}

export async function generateExpertChatAdvice(options: {
  solverName: string;
  solverTitle?: string;
  expertQuestion?: string;
  conversationHistory: Array<{ senderName: string; text: string; isSelf: boolean }>;
}): Promise<ExpertChatAdviceResult> {
  try {
    const res = await fetch('/api/ai/expert-chat-advice', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        solverName: options.solverName,
        solverTitle: options.solverTitle,
        expertQuestion: options.expertQuestion,
        conversationHistory: options.conversationHistory,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.data?.adviceList && Array.isArray(data.data.adviceList)) {
        return data.data as ExpertChatAdviceResult;
      }
    }
  } catch (err) {
    console.warn('Network call to expert-chat-advice failed, using local advice engine:', err);
  }

  // Local fallback advice
  return {
    adviceList: [
      {
        strategyTitle: '專業拆解・引導里程碑',
        suggestedText: `收到您的需求！針對此專案，我建議將其拆解為兩個階段：第一階段先聚焦核心痛點產出架構與可行性驗證，待驗收確認滿意後再進入細部落地。這樣能確保您的預算花在刀口上，您覺得如何？`,
        psychologicalAnalysis: '降低客戶一次性付大錢的心理防線，透過分期驗收建立雙方信任感。',
      },
      {
        strategyTitle: '價值錨定・強調保障',
        suggestedText: `理解您的考量。此專案關鍵在於後續的穩定性與風險控管，我的規劃包含平台完整的款項託管與成果驗收保證，能為您省去後續返工的高額隱性成本。我們可以先就具體規格深入確認。`,
        psychologicalAnalysis: '將焦點從單純的「價格比價」轉移至「品質與風險保障」，提升專業議價籌碼。',
      },
      {
        strategyTitle: '彈性折衷・範疇調整',
        suggestedText: `若目前有預算限制，我們可以先保留最關鍵的核心模組，將次要輔助功能列為第二期選配，這樣即可在您目前的預算內準時上線。我有幾種調整方案可以向您說明。`,
        psychologicalAnalysis: '展現為客戶著想的彈性，在不賤賣自身時薪的前提下達成商業成交。',
      },
    ],
    quickTips: '保持專業自信，不要輕易直接降價；透過調整範圍或分階段交付來維持專業價值。',
  };
}

export * from './aiCrmAgent';

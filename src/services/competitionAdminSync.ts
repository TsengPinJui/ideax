import {
  ParticipantRegistrationData,
  StarSeasonProposal,
  StarSeasonStage,
  StarSeasonTrack,
  CompetitionHomepageStatsConfig,
  DEFAULT_HOMEPAGE_STATS_CONFIG,
  CompetitionAdminMetrics,
  COMPETITION_POINTS_CONFIG,
  UserCompetitionRewardSummary,
  AdminTotalRewardsMetrics,
} from '../types/competition';

export interface CompetitionRegistrationRecord extends ParticipantRegistrationData {
  id: string;
  userId: string;
  proposalId: string;
  status: 'pending_review' | 'approved' | 'rejected';
  reviewNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface CompetitionExpertRecord {
  id: string;
  userId: string;
  expertName: string;
  expertPhone: string;
  expertEmail: string;
  organization: string;
  jobTitle: string;
  expertiseTracks: StarSeasonTrack[];
  yearsOfExperience: number;
  bio: string;
  proofDocumentUrl?: string;
  status: 'pending_review' | 'approved' | 'rejected';
  pointsAllocated: number; // 3,000,000
  singleProjectCap: number; // 2,000,000
  isJudgeSelected?: boolean; // 由專家中選出參與複賽評審
  reviewNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

const REGISTRATIONS_STORAGE_KEY = 'ideax_competition_registrations';
const PROPOSALS_STORAGE_KEY = 'ideax_competition_admin_proposals';
const EXPERTS_STORAGE_KEY = 'ideax_competition_admin_experts';
const HOMEPAGE_STATS_CONFIG_KEY = 'ideax_competition_homepage_stats_config';

// 初始示範專家資料 (每位核發 3,000,000 點數)
const INITIAL_EXPERTS: CompetitionExpertRecord[] = [
  {
    id: 'exp-1',
    userId: 'user-expert-1',
    expertName: '柯育任 院長/教授',
    expertPhone: '0910-123-456',
    expertEmail: 'yr.ko@university.edu.tw',
    organization: '國立頂尖大學 資訊電機學院',
    jobTitle: '特聘教授 兼 產學創新中心主任',
    expertiseTracks: ['ai_applications', 'campus_life'],
    yearsOfExperience: 18,
    bio: '專長為邊緣運算、AIoT 晶片與校園智慧化，曾任多家科技大廠技術顧問與國科會產學審查委員。',
    status: 'approved',
    pointsAllocated: 3_000_000,
    singleProjectCap: 2_000_000,
    isJudgeSelected: true,
    reviewedBy: '站長・仲裁管理員',
    reviewedAt: '2026-10-01T10:00:00Z',
    createdAt: '2026-10-01T08:30:00Z',
  },
  {
    id: 'exp-2',
    userId: 'user-expert-2',
    expertName: '林心儀 創投合夥人',
    expertPhone: '0928-333-777',
    expertEmail: 'hsinyi.lin@apex-vc.com',
    organization: '鼎極早期創業投資基金',
    jobTitle: '資深合夥人 / ESG綠能投資總監',
    expertiseTracks: ['social_impact', 'campus_life'],
    yearsOfExperience: 14,
    bio: '專注於早期新創種子輪至 A 輪投資，主導逾 20 億台幣創業投資案，深入輔導青年商業模式落地。',
    status: 'approved',
    pointsAllocated: 3_000_000,
    singleProjectCap: 2_000_000,
    isJudgeSelected: true,
    reviewedBy: '站長・仲裁管理員',
    reviewedAt: '2026-10-02T15:30:00Z',
    createdAt: '2026-10-02T12:00:00Z',
  },
  {
    id: 'exp-3',
    userId: 'user-expert-3',
    expertName: '張哲銘 醫工所執行長',
    expertPhone: '0935-888-666',
    expertEmail: 'cm.chang@biomed-innov.org',
    organization: '國家生醫科研衍生育成中心',
    jobTitle: '執行長 / 醫材法規輔導專家',
    expertiseTracks: ['hardware_iot', 'ai_applications'],
    yearsOfExperience: 16,
    bio: '前美國 FDA 審查協同專家，輔導台灣生醫晶片團隊完成多起 Spin-off 技轉與二類醫材取證。',
    status: 'approved',
    pointsAllocated: 3_000_000,
    singleProjectCap: 2_000_000,
    isJudgeSelected: false,
    reviewedBy: '站長・仲裁管理員',
    reviewedAt: '2026-10-03T11:00:00Z',
    createdAt: '2026-10-03T09:15:00Z',
  },
  {
    id: 'exp-4',
    userId: 'user-expert-4',
    expertName: '陳雅婷 博士',
    expertPhone: '0955-666-888',
    expertEmail: 'yating.chen@greentech.tw',
    organization: '循環經濟創新研究院',
    jobTitle: '副院長 / 碳權交易顧問',
    expertiseTracks: ['social_impact', 'campus_life'],
    yearsOfExperience: 12,
    bio: '專攻企業碳盤查與低碳材料供應鏈，輔導逾百家上市櫃企業建構綠色轉型路徑。',
    status: 'pending_review',
    pointsAllocated: 3_000_000,
    singleProjectCap: 2_000_000,
    isJudgeSelected: false,
    createdAt: '2026-10-05T14:20:00Z',
  },
];

// 初始示範參賽報名資料 (供管理員後台即時審核驗證)
const INITIAL_REGISTRATIONS: CompetitionRegistrationRecord[] = [
  {
    id: 'reg-1',
    userId: 'user-questioner',
    proposalId: 'prop-star-1',
    teamName: '智傘校園科技隊',
    leaderName: '林書豪',
    leaderPhone: '0912-345-678',
    leaderEmail: 'shuhao.lin@ntu.edu.tw',
    schoolName: '國立臺灣大學',
    department: '資訊工程學系 四年級',
    advisorName: '柯育任 教授',
    teamMembers: [
      { name: '陳冠宇', department: '資工系三年級', role: '技術長 (CTO)' },
      { name: '王詩涵', department: '企管系四年級', role: '商務拓展 (BD)' },
    ],
    track: 'campus_life',
    projectTitle: '校園共享雨傘商模轉型：周邊商圈優惠券與物聯網廣告機台整合方案',
    summary: '將校園共享雨傘從單次租借 NT$20 轉型為學生生活圈 O2O 商家導流平台，結合周邊 40 家餐飲優惠與智慧機台廣告。',
    description: '1. 商業模式：學生持手機 LINE 一鍵借傘，周邊特約商家贊助折價券即享免租金。\n2. 降低折損率：內嵌藍牙低功耗感測與學生身分證件綁定。\n3. 營收預估：單一校區每月廣告與核銷拆帳可達 NT$ 45,000。',
    sourcePainPointId: 'q-1',
    sourcePainPointTitle: '校園共享雨傘如何從租借收入轉向商家合作模式？',
    bpDocumentUrl: 'https://ideax.tw/docs/umbrella_bp_v3.pdf',
    bpDocumentName: '智傘科技_校園創業商業計劃書_v3.pdf',
    bpDocumentSize: 3450000,
    prototypeImageUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&auto=format&fit=crop&q=80',
    prototypeImageName: '智慧機台3D原型圖.png',
    videoUrl: 'https://youtu.be/sample-pitch-umbrella',
    targetFundingAmount: 300000,
    rewardPlanDescription: '贊助 NT$500 享全台校園 1 年免費借傘 + 聯名抗風環保折疊傘 1 支。',
    pledgeAgreed: true,
    status: 'pending_review',
    createdAt: '2026-10-01T09:30:00Z',
  },
  {
    id: 'reg-2',
    userId: 'user-author-4',
    proposalId: 'prop-star-2',
    teamName: '綠食裂變新創組',
    leaderName: '蘇小涵',
    leaderPhone: '0922-888-999',
    leaderEmail: 'su.xiaohan@nthu.edu.tw',
    schoolName: '國立清華大學',
    department: '科技管理研究所 碩一',
    advisorName: '黃副院長',
    teamMembers: [
      { name: '李佳穎', department: '食科系四年級', role: '營養研發' },
    ],
    track: 'social_impact',
    projectTitle: '園區上班族低 GI 健康餐盒 D2C 辦公大樓團購訂閱拼單平台',
    summary: '擺脫外送平台 35% 高抽成，設計主揪團長免運用餐與樓層團購裂變，結合定點保溫箱專車自提。',
    description: '針對內湖與南港科技園區，透過 LINE 官方團購機器人，每週固定配送，主揪團長享專屬分潤。',
    sourcePainPointId: 'q-4',
    sourcePainPointTitle: '冷啟動階段的健康餐盒 D2C 品牌，如何利用辦公大樓團購拼單裂變打響第一波口碑？',
    bpDocumentUrl: 'https://ideax.tw/docs/mealbox_bp.pdf',
    bpDocumentName: '綠食新創營運企劃書.pdf',
    bpDocumentSize: 2800000,
    prototypeImageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80',
    prototypeImageName: '餐盒包裝與定點配送箱.jpg',
    videoUrl: 'https://youtu.be/sample-pitch-mealbox',
    targetFundingAmount: 250000,
    rewardPlanDescription: '贊助 NT$1,000 即享 10 份低碳健康餐盒電子兌換券。',
    pledgeAgreed: true,
    status: 'approved',
    reviewedBy: '站長・仲裁管理員',
    reviewNote: '商模清晰且團隊具備食品研發背景，准予進入公開募資專區。',
    reviewedAt: '2026-10-03T14:20:00Z',
    createdAt: '2026-10-02T11:00:00Z',
  },
  {
    id: 'reg-3',
    userId: 'user-author-5',
    proposalId: 'prop-star-3',
    teamName: '微晶生醫創研社',
    leaderName: '何副教授團隊',
    leaderPhone: '0933-111-222',
    leaderEmail: 'he.biotech@nycu.edu.tw',
    schoolName: '國立陽明交通大學',
    department: '生醫光電研究所',
    advisorName: '何副教授',
    track: 'ai_applications',
    projectTitle: '微流體光學晶片即時快篩：產學技轉與科研衍生 Spin-off 商業化路徑',
    summary: '針對頂級期刊發表之微流體快篩光學晶片，評估大廠技轉與衍生新創之股權分配、法規認證及量產架構。',
    description: '結合半導體晶圓封裝與生醫快篩试劑，打造掌上型高精準度多重疾病檢測儀。',
    sourcePainPointId: 'q-5',
    sourcePainPointTitle: '生醫感測晶片研究成果，該選擇向大廠技術移轉還是自組團隊 Spin-off？',
    bpDocumentUrl: 'https://ideax.tw/docs/biochip_tech.pdf',
    bpDocumentName: '微晶光電晶片技術報告_NDA.pdf',
    bpDocumentSize: 5120000,
    prototypeImageUrl: 'https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?w=800&auto=format&fit=crop&q=80',
    prototypeImageName: '微流體光學感測模組.png',
    targetFundingAmount: 800000,
    rewardPlanDescription: '早期科研支持者名錄刻印於晶片外殼 + 紀念封裝晶片展示架。',
    pledgeAgreed: true,
    status: 'pending_review',
    createdAt: '2026-10-04T16:45:00Z',
  },
];

// 初始示範提案審核資料
const INITIAL_PROPOSALS: StarSeasonProposal[] = [
  {
    id: 'prop-star-1',
    title: '校園共享雨傘商模轉型：周邊商圈優惠券與物聯網廣告機台整合方案',
    stage: 'solution',
    track: 'cultural_services',
    summary: '將校園共享雨傘從單次租借 NT$20 轉型為學生生活圈 O2O 商家導流平台，結合周邊 40 家餐飲優惠與智慧機台廣告。',
    description: '1. 商業模式：學生持手機 LINE 一鍵借傘，周邊特約商家贊助折價券即享免租金。\n2. 降低折損率：內嵌藍牙低功耗感測與學生身分證件綁定。\n3. 營收預估：單一校區每月廣告與核銷拆帳可達 NT$ 45,000。',
    images: [
      'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=600&auto=format&fit=crop&q=80',
    ],
    tags: ['共享經濟', '校園商模', '物聯網設備', 'O2O導流'],
    technicalFeasibility: '已完成 ESP32 機台硬體開源韌體與 LINE LIFF 開發，單機成本小於 NT$1,200。',
    marketAnalysis: '全台大專校院逾 100 萬學生，校園商圈 500 公尺生活圈覆蓋率高。',
    businessModelFinancials: '廣告機台月租 + 商家核銷佣金 8%，預估 4 個月單站回收。',
    authorId: 'user-questioner',
    authorName: '林書豪',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    authorRole: 'user',
    sourcePainPointProposalId: 'q-1',
    sourcePainPointTitle: '校園共享雨傘如何從租借收入轉向商家合作模式？',
    status: 'pending_review',
    supportPoints: 185000,
    supporterCount: 42,
    targetFundingAmount: 300000,
    likeCount: 56,
    commentsCount: 18,
    createdAt: '2026-10-01T09:30:00Z',
    updatedAt: '2026-10-01T09:30:00Z',
  },
  {
    id: 'prop-star-2',
    title: '園區上班族低 GI 健康餐盒 D2C 辦公大樓團購訂閱拼單平台',
    stage: 'solution',
    track: 'cultural_services',
    summary: '擺脫外送平台 35% 高抽成，設計主揪團長免運用餐與樓層團購裂變，結合定點保溫箱專車自提。',
    description: '針對內湖與南港科技園區，透過 LINE 官方團購機器人，每週固定配送，主揪團長享專屬分潤。',
    images: [
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=600&auto=format&fit=crop&q=80',
    ],
    tags: ['健康餐飲', 'D2C拼單', '生活服務', '團購裂變'],
    technicalFeasibility: '自研免運拼單演算法，精準聚合各棟大樓時段性需求。',
    marketAnalysis: '內科南軟上班族逾 25 萬人，健康低 GI 每日剛需消費力強。',
    businessModelFinancials: '直接對接中央廚房，毛利率提高至 42%，主揪團長分潤 6%。',
    authorId: 'user-author-4',
    authorName: '蘇小涵',
    authorAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    authorRole: 'user',
    sourcePainPointProposalId: 'q-4',
    sourcePainPointTitle: '冷啟動階段的健康餐盒 D2C 品牌，如何利用辦公大樓團購拼單裂變打響第一波口碑？',
    status: 'approved',
    supportPoints: 240000,
    supporterCount: 68,
    targetFundingAmount: 250000,
    likeCount: 89,
    commentsCount: 24,
    rankQualifiedForFinal: true,
    createdAt: '2026-10-02T11:00:00Z',
    updatedAt: '2026-10-03T14:20:00Z',
  },
  {
    id: 'prop-star-3',
    title: '微流體光學晶片即時快篩：產學技轉與科研衍生 Spin-off 商業化路徑',
    stage: 'solution',
    track: 'biomedical',
    summary: '針對頂級期刊發表之微流體快篩光學晶片，評估大廠技轉與衍生新創之股權分配、法規認證及量產架構。',
    description: '結合半導體晶圓封裝與生醫快篩試劑，打造掌上型高精準度多重疾病檢測儀。',
    images: [
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1518152006812-edab29b069ac?w=600&auto=format&fit=crop&q=80',
    ],
    tags: ['生醫晶片', '精準醫療', '產學技轉', '即時快篩'],
    technicalFeasibility: '具備微流道奈米鍍膜專利，樣品檢測敏感度達 98.7%。',
    marketAnalysis: '居家定點照護 POCT 全球市場年複合成長率達 11.2%。',
    businessModelFinancials: '儀器硬體平價普及 + 拋棄式檢測試劑卡匣高毛利訂閱耗材。',
    authorId: 'user-author-5',
    authorName: '何副教授團隊',
    authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    authorRole: 'user',
    sourcePainPointProposalId: 'q-5',
    sourcePainPointTitle: '生醫感測晶片研究成果，該選擇向大廠技術移轉還是自組團隊 Spin-off？',
    status: 'pending_review',
    supportPoints: 95000,
    supporterCount: 19,
    targetFundingAmount: 800000,
    likeCount: 38,
    commentsCount: 11,
    createdAt: '2026-10-04T16:45:00Z',
    updatedAt: '2026-10-04T16:45:00Z',
  },
  {
    id: 'prop-star-4',
    title: '【痛點徵件】傳統長照機構失智長者夜間離床安全警報誤報率高問題',
    stage: 'pain_point',
    track: 'biomedical',
    summary: '護理之家夜間照護人力吃緊，重力床墊誤報率高達 40%，急需毫米波雷達非接觸式生理與跌倒預警整合解方。',
    description: '長照機構面臨夜班護理人力極限，若能有零接觸、不侵犯隱私且誤報率低於 5% 的方案，全台逾千家長照中心皆有採購需求。',
    images: [
      'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=600&auto=format&fit=crop&q=80',
    ],
    tags: ['智慧長照', '毫米波雷達', '非接觸照護', '失智跌倒預警'],
    authorId: 'user-care-1',
    authorName: '安泰長照中心主任',
    authorAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    authorRole: 'user',
    status: 'approved',
    supportPoints: 110000,
    supporterCount: 35,
    likeCount: 72,
    commentsCount: 15,
    createdAt: '2026-10-03T10:00:00Z',
    updatedAt: '2026-10-03T10:00:00Z',
  },
  {
    id: 'prop-star-5',
    title: '智慧微電網動態需量反應：分散式綠能調度與 AI 負載預測系統',
    stage: 'solution',
    track: 'mechanical_transport',
    summary: '結合工業廠房儲能與分散式太陽能微電網，利用低延遲 AI 預測峰值負載並實現秒級電力調度。',
    description: '整合邊緣感測器與台電即時電價需量反應 API，降低製造業尖峰契約容量罰款 30% 以上。',
    images: [
      'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600&auto=format&fit=crop&q=80',
    ],
    tags: ['機電運輸', '智慧微電網', 'AI需量反應', '綠能調度'],
    technicalFeasibility: '邊緣推論延遲小於 200ms，支援 Modbus/RS485 與 MQTT 工控協議。',
    marketAnalysis: 'RE100 與碳費開徵帶動全台高壓用電戶智慧電網剛需。',
    businessModelFinancials: '節電分潤制 (Performance-based) + 能源管理 SaaS 年訂閱費。',
    authorId: 'user-author-2',
    authorName: '陳電機博士',
    authorAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    authorRole: 'user',
    status: 'approved',
    supportPoints: 215000,
    supporterCount: 54,
    targetFundingAmount: 500000,
    likeCount: 65,
    commentsCount: 19,
    createdAt: '2026-10-04T12:00:00Z',
    updatedAt: '2026-10-04T12:00:00Z',
  },
];

/**
 * 取得所有參賽報名資料
 */
export function getCompetitionRegistrations(): CompetitionRegistrationRecord[] {
  try {
    const raw = localStorage.getItem(REGISTRATIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  saveAllCompetitionRegistrations(INITIAL_REGISTRATIONS);
  return INITIAL_REGISTRATIONS;
}

/**
 * 儲存所有參賽報名資料
 */
export function saveAllCompetitionRegistrations(records: CompetitionRegistrationRecord[]): void {
  try {
    localStorage.setItem(REGISTRATIONS_STORAGE_KEY, JSON.stringify(records));
  } catch {}
}

/**
 * 新增參賽報名紀錄 (報名時同步錄入後台審核)
 */
export function recordNewParticipantRegistration(data: ParticipantRegistrationData, userId: string, proposalId: string): CompetitionRegistrationRecord {
  const current = getCompetitionRegistrations();
  const newRecord: CompetitionRegistrationRecord = {
    ...data,
    id: `reg-${Date.now()}`,
    userId,
    proposalId,
    status: 'pending_review',
    createdAt: new Date().toISOString(),
  };
  const updated = [newRecord, ...current];
  saveAllCompetitionRegistrations(updated);

  // 同步也建立待審核提案
  recordNewProposalFromRegistration(newRecord);

  return newRecord;
}

/**
 * 管理員更新參賽報名審核狀態
 */
export function updateCompetitionRegistrationStatus(
  id: string,
  status: 'pending_review' | 'approved' | 'rejected',
  reviewNote?: string,
  reviewerName = '站長・仲裁管理員'
): boolean {
  const current = getCompetitionRegistrations();
  const idx = current.findIndex((r) => r.id === id);
  if (idx === -1) return false;

  current[idx] = {
    ...current[idx],
    status,
    reviewNote: reviewNote || current[idx].reviewNote,
    reviewedBy: reviewerName,
    reviewedAt: new Date().toISOString(),
  };

  saveAllCompetitionRegistrations(current);

  // 同步更新提案審核狀態
  if (current[idx].proposalId) {
    updateCompetitionProposalReviewStatus(current[idx].proposalId, status, reviewNote);
  }

  return true;
}

/**
 * 取得所有競賽提案（管理員審核用）
 */
export function getCompetitionProposalsForAdmin(): StarSeasonProposal[] {
  try {
    const raw = localStorage.getItem(PROPOSALS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  saveAllCompetitionProposals(INITIAL_PROPOSALS);
  return INITIAL_PROPOSALS;
}

/**
 * 儲存所有提案
 */
export function saveAllCompetitionProposals(proposals: StarSeasonProposal[]): void {
  try {
    localStorage.setItem(PROPOSALS_STORAGE_KEY, JSON.stringify(proposals));
  } catch {}
}

/**
 * 從報名自動生成提案紀錄
 */
function recordNewProposalFromRegistration(reg: CompetitionRegistrationRecord): void {
  const proposals = getCompetitionProposalsForAdmin();
  const newProp: StarSeasonProposal = {
    id: reg.proposalId,
    title: reg.projectTitle,
    stage: 'solution',
    track: reg.track,
    summary: reg.summary,
    description: reg.description,
    authorId: reg.userId,
    authorName: reg.leaderName,
    authorRole: 'user',
    sourcePainPointProposalId: reg.sourcePainPointId,
    sourcePainPointTitle: reg.sourcePainPointTitle,
    status: reg.status,
    supportPoints: 0,
    supporterCount: 0,
    targetFundingAmount: reg.targetFundingAmount,
    likeCount: 0,
    commentsCount: 0,
    attachmentUrl: reg.bpDocumentUrl,
    attachmentName: reg.bpDocumentName,
    createdAt: reg.createdAt,
    updatedAt: reg.createdAt,
  };
  saveAllCompetitionProposals([newProp, ...proposals.filter((p) => p.id !== reg.proposalId)]);
}

/**
 * 管理員更新提案審核狀態
 */
export function updateCompetitionProposalReviewStatus(
  proposalId: string,
  status: 'pending_review' | 'approved' | 'rejected',
  reviewNote?: string
): boolean {
  const current = getCompetitionProposalsForAdmin();
  const idx = current.findIndex((p) => p.id === proposalId);
  if (idx === -1) return false;

  current[idx] = {
    ...current[idx],
    status,
    reviewNote: reviewNote || current[idx].reviewNote,
    updatedAt: new Date().toISOString(),
  };

  saveAllCompetitionProposals(current);
  return true;
}

/**
 * 管理員核定名次與痛點採用獎勵
 */
export function updateCompetitionProposalAward(
  proposalId: string,
  finalRank: number,
  awardConfirmed: boolean,
  adoptedSourceApproved: boolean
): boolean {
  const current = getCompetitionProposalsForAdmin();
  const idx = current.findIndex((p) => p.id === proposalId);
  if (idx === -1) return false;

  current[idx] = {
    ...current[idx],
    finalRank,
    finalAwardConfirmed: awardConfirmed,
    adoptedSourceApproved,
    adoptedByWinningSolution: awardConfirmed,
    adoptedSourceRewardStatus: adoptedSourceApproved ? 'approved' : 'pending',
    updatedAt: new Date().toISOString(),
  };

  saveAllCompetitionProposals(current);
  return true;
}

/**
 * 取得所有專家申請與名單
 */
export function getCompetitionExperts(): CompetitionExpertRecord[] {
  try {
    const raw = localStorage.getItem(EXPERTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  saveAllCompetitionExperts(INITIAL_EXPERTS);
  return INITIAL_EXPERTS;
}

/**
 * 儲存所有專家名單
 */
export function saveAllCompetitionExperts(experts: CompetitionExpertRecord[]): void {
  try {
    localStorage.setItem(EXPERTS_STORAGE_KEY, JSON.stringify(experts));
  } catch {}
}

/**
 * 新增專家申請
 */
export function recordNewExpertApplication(
  expert: Omit<CompetitionExpertRecord, 'id' | 'createdAt' | 'status' | 'pointsAllocated' | 'singleProjectCap'>
): CompetitionExpertRecord {
  const current = getCompetitionExperts();
  const newExpert: CompetitionExpertRecord = {
    ...expert,
    id: `exp-${Date.now()}`,
    status: 'pending_review',
    pointsAllocated: COMPETITION_POINTS_CONFIG.INITIAL_EXPERT_POINTS,
    singleProjectCap: COMPETITION_POINTS_CONFIG.SINGLE_SUPPORT_LIMIT.solver,
    createdAt: new Date().toISOString(),
  };
  const updated = [newExpert, ...current];
  saveAllCompetitionExperts(updated);
  return newExpert;
}

/**
 * 管理員審核專家申請 (通過即配發 3,000,000 點數與設定評審資格)
 */
export function updateCompetitionExpertStatus(
  expertId: string,
  status: 'pending_review' | 'approved' | 'rejected',
  isJudgeSelected = false,
  reviewNote?: string,
  reviewerName = '站長・仲裁管理員'
): boolean {
  const current = getCompetitionExperts();
  const idx = current.findIndex((e) => e.id === expertId);
  if (idx === -1) return false;

  current[idx] = {
    ...current[idx],
    status,
    isJudgeSelected,
    reviewNote: reviewNote || current[idx].reviewNote,
    reviewedBy: reviewerName,
    reviewedAt: new Date().toISOString(),
  };

  saveAllCompetitionExperts(current);
  return true;
}

/**
 * 取得競賽網首頁公開數據配置
 */
export function getCompetitionHomepageStatsConfig(): CompetitionHomepageStatsConfig {
  try {
    const raw = localStorage.getItem(HOMEPAGE_STATS_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_HOMEPAGE_STATS_CONFIG,
        ...parsed,
      };
    }
  } catch {}
  return DEFAULT_HOMEPAGE_STATS_CONFIG;
}

/**
 * 儲存競賽網首頁公開數據配置
 */
export function saveCompetitionHomepageStatsConfig(config: CompetitionHomepageStatsConfig): void {
  try {
    localStorage.setItem(HOMEPAGE_STATS_CONFIG_KEY, JSON.stringify(config));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ideax_competition_stats_config_updated', { detail: config }));
    }
  } catch {}
}

/**
 * 計算競賽全站聚合數據 (供管理員後台檢視與首頁公開展示)
 */
export function getCompetitionAggregatedMetrics(): CompetitionAdminMetrics {
  const registrations = getCompetitionRegistrations();
  const proposals = getCompetitionProposalsForAdmin();
  const experts = getCompetitionExperts();

  // 1. 登入用戶數估算 (基於帳號/報名/專家/提案人/支持者集合)
  const userSet = new Set<string>();
  userSet.add('user-questioner');
  userSet.add('user-author-4');
  userSet.add('user-author-5');
  userSet.add('user-care-1');
  registrations.forEach((r) => r.userId && userSet.add(r.userId));
  proposals.forEach((p) => p.authorId && userSet.add(p.authorId));
  experts.forEach((e) => e.userId && userSet.add(e.userId));

  // 基礎登入與活躍社群支持用戶
  const loggedInUsersCount = Math.max(userSet.size + 128, 142);
  const totalRegisteredUsers = loggedInUsersCount + 45;

  // 2. 參賽者數
  const participantsCount = registrations.length;
  const approvedParticipantsCount = registrations.filter((r) => r.status === 'approved').length;
  const pendingParticipantsCount = registrations.filter((r) => r.status === 'pending_review').length;

  // 3. 專家數
  const expertsCount = experts.length;
  const approvedExpertsCount = experts.filter((e) => e.status === 'approved').length;
  const pendingExpertsCount = experts.filter((e) => e.status === 'pending_review').length;

  // 4. 提案數 (想解方/創新提案)
  const solutionProposals = proposals.filter((p) => p.stage === 'solution');
  const proposalsCount = solutionProposals.length;
  const approvedProposalsCount = solutionProposals.filter((p) => p.status === 'approved').length;
  const pendingProposalsCount = solutionProposals.filter((p) => p.status === 'pending_review').length;

  // 5. 痛點數 (徵點子/切身痛點)
  const painPoints = proposals.filter((p) => p.stage === 'pain_point');
  const painPointsCount = Math.max(painPoints.length + 3, 5); // 加上預設切身痛點徵集數
  const approvedPainPointsCount = painPoints.filter((p) => p.status === 'approved').length + 3;

  // 6. 已配發創星幣計算（各身份帳號及推薦碼產生的點數總額）
  // (A) 專家創星幣：通過審核的每位專家核發 3,000,000 創星幣
  const expertsTotalPoints = approvedExpertsCount * COMPETITION_POINTS_CONFIG.INITIAL_EXPERT_POINTS;

  // (B) 參賽者與活躍大眾帳號初始創星幣：每帳號 100,000 創星幣
  const participantsTotalPoints = loggedInUsersCount * COMPETITION_POINTS_CONFIG.INITIAL_USER_POINTS;

  // (C) 校園推廣大使推薦碼獎勵點數：每推薦 1 件審核通過提案即享 300 點 (價值 $400)
  const approvedReferralProposalsCount = approvedParticipantsCount + 12; // 通過審核推薦案例
  const referralBonusTotalPoints = approvedReferralProposalsCount * COMPETITION_POINTS_CONFIG.AMBASSADOR_REWARD_PER_APPROVED;

  // (D) 痛點採用獎勵點數
  const adoptedPainPointsCount = proposals.filter((p) => p.adoptedSourceApproved || p.adoptedByWinningSolution).length + 2;
  const painPointAdoptionPoints = adoptedPainPointsCount * COMPETITION_POINTS_CONFIG.PAIN_POINT_ADOPTION_REWARD;

  // (E) 分享推薦碼獎勵：每人 100 創星幣
  const shareBonusPoints = loggedInUsersCount * COMPETITION_POINTS_CONFIG.SHARE_BONUS_POINTS;

  // 總計已配發創星幣 (模擬募資額度)
  const totalAllocatedPoints =
    expertsTotalPoints +
    participantsTotalPoints +
    referralBonusTotalPoints +
    painPointAdoptionPoints +
    shareBonusPoints;

  // =========================================================================
  // 7. 同步計算每個用戶的當前累積獲得獎金與點數獎勵 (User Competition Reward Summaries)
  // =========================================================================
  // 示範/即時用戶清單
  const seedUserList = [
    {
      userId: 'user-questioner',
      userName: '林書豪 (智傘科技隊長)',
      userRole: '青年創客 / 提案者',
      userEmail: 'shuhao.lin@ntu.edu.tw',
      userPhone: '0912-345-678',
      approvedPainPointsCount: 2, // 提出 2 個痛點過審
      adoptedTop3Count: 1,        // 1 個痛點獲冠軍採用 (800 點 / 價值 $1,000)
      adoptedTop4To10Count: 0,
      ambassadorApprovedCount: 3, // 成功推薦 3 隊 (900 點 / 價值 $1,200)
      awardRank: 1,               // 獲得冠軍 (NT$20,000 + 8,000 點 / 價值 $10,000)
    },
    {
      userId: 'user-author-4',
      userName: '王宣佑 (生醫團隊長)',
      userRole: '參賽團隊負責人',
      userEmail: 'hsuanyu.wang@cmu.edu.tw',
      userPhone: '0933-222-111',
      approvedPainPointsCount: 1,
      adoptedTop3Count: 0,
      adoptedTop4To10Count: 1, // 400 點 / 價值 $500
      ambassadorApprovedCount: 2, // 600 點 / 價值 $800
      awardRank: 2,               // 獲得亞軍 (NT$6,000 + 3,200 點 / 價值 $4,000)
    },
    {
      userId: 'user-author-5',
      userName: '張敏慈 (ESG永續隊長)',
      userRole: '參賽團隊負責人',
      userEmail: 'min.chang@ncku.edu.tw',
      userPhone: '0988-777-666',
      approvedPainPointsCount: 1,
      adoptedTop3Count: 0,
      adoptedTop4To10Count: 0,
      ambassadorApprovedCount: 1, // 300 點 / 價值 $400
      awardRank: 3,               // 獲得季軍 (NT$3,000 + 1,600 點 / 價值 $2,000)
    },
    {
      userId: 'user-care-1',
      userName: '李雅芬 (銀髮照護志工)',
      userRole: '痛點提出者 / 一般會員',
      userEmail: 'yafen.lee@community.tw',
      userPhone: '0918-999-000',
      approvedPainPointsCount: 3, // 3 個過審痛點 = 600 點 (價值 $750)
      adoptedTop3Count: 1,        // 獲前 3 名採用 = 800 點 (價值 $1,000)
      adoptedTop4To10Count: 1,    // 獲 4~10 名採用 = 400 點 (價值 $500)
      ambassadorApprovedCount: 4, // 推薦 4 隊 = 1,200 點 (價值 $1,600)
      awardRank: undefined,
    },
    {
      userId: 'user-ambassador-star',
      userName: '陳柏宇 (校園推廣大使)',
      userRole: '校園推廣大使',
      userEmail: 'boyu.chen@campus.edu.tw',
      userPhone: '0970-111-222',
      approvedPainPointsCount: 1, // 200 點 (價值 $250)
      adoptedTop3Count: 0,
      adoptedTop4To10Count: 0,
      ambassadorApprovedCount: 8, // 推薦 8 案過審 = 2,400 點 (價值 $3,200)
      awardRank: undefined,
    },
  ];

  // 計算每個用戶的獎金與點數明細
  const userRewardSummaries: UserCompetitionRewardSummary[] = seedUserList.map((u) => {
    // 1. 痛點過審獎勵 (每案 200 點，價值 $250)
    const painPointSubmissionPoints = u.approvedPainPointsCount * COMPETITION_POINTS_CONFIG.PAIN_POINT_SUBMISSION_REWARD;
    const painPointSubmissionValue = u.approvedPainPointsCount * COMPETITION_POINTS_CONFIG.PAIN_POINT_SUBMISSION_REWARD_VALUE;

    // 2. 痛點採用獎勵 (前1~3名 800 點/價值$1000; 前4~10名 400 點/價值$500)
    const top3Pts = u.adoptedTop3Count * COMPETITION_POINTS_CONFIG.PAIN_POINT_ADOPTION_REWARDS.TOP_1_3.points;
    const top3Val = u.adoptedTop3Count * COMPETITION_POINTS_CONFIG.PAIN_POINT_ADOPTION_REWARDS.TOP_1_3.value;
    const top4To10Pts = u.adoptedTop4To10Count * COMPETITION_POINTS_CONFIG.PAIN_POINT_ADOPTION_REWARDS.TOP_4_10.points;
    const top4To10Val = u.adoptedTop4To10Count * COMPETITION_POINTS_CONFIG.PAIN_POINT_ADOPTION_REWARDS.TOP_4_10.value;
    const painPointAdoptionPointsTotal = top3Pts + top4To10Pts;
    const painPointAdoptionValueTotal = top3Val + top4To10Val;

    // 3. 校園推廣大使獎勵 (每推薦1案過審 300 點，價值 $400)
    const ambassadorPoints = u.ambassadorApprovedCount * COMPETITION_POINTS_CONFIG.AMBASSADOR_REWARD_PER_APPROVED_POINTS;
    const ambassadorValue = u.ambassadorApprovedCount * COMPETITION_POINTS_CONFIG.AMBASSADOR_REWARD_PER_APPROVED_VALUE;

    // 4. 決選獲獎獎勵
    let awardCash = 0;
    let awardPoints = 0;
    let awardPointsValue = 0;
    let awardTotalValue = 0;

    if (u.awardRank === 1) {
      awardCash = COMPETITION_POINTS_CONFIG.AWARDS.CHAMPION.cash;
      awardPoints = COMPETITION_POINTS_CONFIG.AWARDS.CHAMPION.points;
      awardPointsValue = COMPETITION_POINTS_CONFIG.AWARDS.CHAMPION.pointsValue;
      awardTotalValue = COMPETITION_POINTS_CONFIG.AWARDS.CHAMPION.totalValue;
    } else if (u.awardRank === 2) {
      awardCash = COMPETITION_POINTS_CONFIG.AWARDS.RUNNER_UP.cash;
      awardPoints = COMPETITION_POINTS_CONFIG.AWARDS.RUNNER_UP.points;
      awardPointsValue = COMPETITION_POINTS_CONFIG.AWARDS.RUNNER_UP.pointsValue;
      awardTotalValue = COMPETITION_POINTS_CONFIG.AWARDS.RUNNER_UP.totalValue;
    } else if (u.awardRank === 3) {
      awardCash = COMPETITION_POINTS_CONFIG.AWARDS.THIRD.cash;
      awardPoints = COMPETITION_POINTS_CONFIG.AWARDS.THIRD.points;
      awardPointsValue = COMPETITION_POINTS_CONFIG.AWARDS.THIRD.pointsValue;
      awardTotalValue = COMPETITION_POINTS_CONFIG.AWARDS.THIRD.totalValue;
    }

    const totalCashReward = awardCash;
    const totalIdeaXPoints = painPointSubmissionPoints + painPointAdoptionPointsTotal + ambassadorPoints + awardPoints;
    const totalPointsEstimatedValue = painPointSubmissionValue + painPointAdoptionValueTotal + ambassadorValue + awardPointsValue;
    const grandTotalValue = totalCashReward + totalPointsEstimatedValue;

    return {
      userId: u.userId,
      userName: u.userName,
      userRole: u.userRole,
      userEmail: u.userEmail,
      userPhone: u.userPhone,
      approvedPainPointsCount: u.approvedPainPointsCount,
      painPointSubmissionPoints,
      painPointSubmissionValue,
      adoptedTop3Count: u.adoptedTop3Count,
      adoptedTop4To10Count: u.adoptedTop4To10Count,
      painPointAdoptionPoints: painPointAdoptionPointsTotal,
      painPointAdoptionValue: painPointAdoptionValueTotal,
      ambassadorApprovedCount: u.ambassadorApprovedCount,
      ambassadorPoints,
      ambassadorValue,
      awardRank: u.awardRank,
      awardCash,
      awardPoints,
      awardPointsValue,
      awardTotalValue,
      totalCashReward,
      totalIdeaXPoints,
      totalPointsEstimatedValue,
      grandTotalValue,
    };
  });

  // 全用戶總額聚合
  const totalCashDistributed = userRewardSummaries.reduce((sum, u) => sum + u.totalCashReward, 0);
  const totalIdeaXPointsDistributed = userRewardSummaries.reduce((sum, u) => sum + u.totalIdeaXPoints, 0);
  const totalPointsEstimatedValue = userRewardSummaries.reduce((sum, u) => sum + u.totalPointsEstimatedValue, 0);
  const grandTotalRewardsValue = totalCashDistributed + totalPointsEstimatedValue;

  const rewardsMetrics: AdminTotalRewardsMetrics = {
    totalCashDistributed,
    totalIdeaXPointsDistributed,
    totalPointsEstimatedValue,
    grandTotalRewardsValue,
    breakdown: {
      championCash: COMPETITION_POINTS_CONFIG.AWARDS.CHAMPION.cash,
      championPoints: COMPETITION_POINTS_CONFIG.AWARDS.CHAMPION.points,
      runnerUpCash: COMPETITION_POINTS_CONFIG.AWARDS.RUNNER_UP.cash,
      runnerUpPoints: COMPETITION_POINTS_CONFIG.AWARDS.RUNNER_UP.points,
      thirdCash: COMPETITION_POINTS_CONFIG.AWARDS.THIRD.cash,
      thirdPoints: COMPETITION_POINTS_CONFIG.AWARDS.THIRD.points,
      painPointSubmissionTotalPoints: userRewardSummaries.reduce((sum, u) => sum + u.painPointSubmissionPoints, 0),
      painPointAdoptionTotalPoints: userRewardSummaries.reduce((sum, u) => sum + u.painPointAdoptionPoints, 0),
      ambassadorTotalPoints: userRewardSummaries.reduce((sum, u) => sum + u.ambassadorPoints, 0),
    },
  };

  return {
    loggedInUsersCount,
    totalRegisteredUsers,
    participantsCount,
    approvedParticipantsCount,
    pendingParticipantsCount,
    expertsCount,
    approvedExpertsCount,
    pendingExpertsCount,
    proposalsCount,
    approvedProposalsCount,
    pendingProposalsCount,
    painPointsCount,
    approvedPainPointsCount,
    totalAllocatedPoints,
    pointsBreakdown: {
      expertsTotalPoints,
      participantsTotalPoints,
      referralBonusTotalPoints,
      painPointAdoptionPoints,
      shareBonusPoints,
    },
    rewardsMetrics,
    userRewardSummaries,
  };
}

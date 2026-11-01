import { Question } from '../types';
import { deriveInnovationProposalName } from './titleFormat';
import { generateTitleCover } from './proposalImageUtils';

/**
 * 1. 判斷該提問是否屬於「提出痛點」(pain_point)
 */
export const isPainPointQuestion = (question?: Partial<Question> | null): boolean => {
  if (!question) return false;
  if (question.postType) {
    return question.postType === 'pain_point';
  }
  if (question.specialZone === 'pain_points') return true;
  if (question.tags && question.tags.some((t) => t.includes('痛點'))) return true;
  return false;
};

/**
 * 2. 判斷該提問是否屬於「創新解方 / 創新提案」(innovation_proposal)
 */
export const isInnovationProposalQuestion = (question?: Partial<Question> | null): boolean => {
  if (!question) return false;
  if (question.postType) {
    return question.postType === 'innovation_proposal';
  }
  if (question.specialZone === 'create_ideas') return true;
  return false;
};

/**
 * 3. 判斷該提問是否屬於「軟體網站 / VibeCoding 應用」(vibecoding_app)
 * 核心規則：在 VibeCoding 展場下，嚴格僅展示軟體網站與程式應用作品；
 * 嚴格排除痛點、閒聊討論、尋求解答與創新解方提案。
 */
export const isVibeCodingAppQuestion = (question?: Partial<Question> | null): boolean => {
  if (!question) return false;
  if (question.postType) {
    return question.postType === 'vibecoding_app';
  }
  if (question.specialZone === 'vibecoding') return true;
  return false;
};

/**
 * 4. 判斷該提問是否屬於「L0 討論區 / 閒聊討論」(chat_discussion)
 * 核心規則：從「尋求解答」或「提出痛點」或「創新提案」或「VibeCoding」提出的問題，
 * 就算設定等級是 L0 也不要算入 L0 討論區！
 */
export const isL0DiscussionQuestion = (question?: Partial<Question> | null): boolean => {
  if (!question) return false;
  if (question.postType) {
    return question.postType === 'chat_discussion';
  }
  if (question.specialZone === 'l0_discussion') return true;
  const hasDiscussionTag = question.tags && question.tags.some((t) => t.includes('閒聊') || t.includes('L0討論'));
  if (hasDiscussionTag) return true;
  return false;
};

/**
 * 5. 判斷該提問是否屬於「提問 / 尋求解答」(seek_solution)
 */
export const isSeekSolutionQuestion = (question?: Partial<Question> | null): boolean => {
  if (!question) return false;
  if (question.postType) {
    return question.postType === 'seek_solution';
  }
  if (
    isPainPointQuestion(question) ||
    isInnovationProposalQuestion(question) ||
    isVibeCodingAppQuestion(question) ||
    isL0DiscussionQuestion(question)
  ) {
    return false;
  }
  return true;
};

/**
 * 6. 將平台資料庫之創新提案 Question 轉換為創星季/創點子 StarSeasonProposal 格式（支援後台資料庫同步刪除與更新日誌）
 */
export const questionToStarSeasonProposal = (q: Question): import('../types/competition').StarSeasonProposal => {
  let track: import('../types/competition').StarSeasonTrack = 'ict';
  const text = `${q.category} ${q.subcategory || ''} ${(q.tags || []).join(' ')} ${q.title}`;
  if (q.subcategory === '生醫化材') {
    track = 'biomedical';
  } else if (q.subcategory === '機電運輸') {
    track = 'mechanical_transport';
  } else if (q.subcategory === '服務文創') {
    track = 'cultural_services';
  } else if (q.subcategory === '資通訊') {
    track = 'ict';
  } else if (
    text.includes('醫療') ||
    text.includes('生技') ||
    text.includes('健康') ||
    text.includes('復健') ||
    text.includes('照護') ||
    text.includes('營養') ||
    text.includes('牙') ||
    text.includes('診所') ||
    text.includes('藥')
  ) {
    track = 'biomedical';
  } else if (
    text.includes('製造') ||
    text.includes('物流') ||
    text.includes('農業') ||
    text.includes('儲能') ||
    text.includes('電網') ||
    text.includes('綠能') ||
    text.includes('機械') ||
    text.includes('充電') ||
    text.includes('冷鏈') ||
    text.includes('工廠')
  ) {
    track = 'mechanical_transport';
  } else if (
    text.includes('餐飲') ||
    text.includes('旅宿') ||
    text.includes('書店') ||
    text.includes('團購') ||
    text.includes('租屋') ||
    text.includes('共生') ||
    text.includes('寵物') ||
    text.includes('親子') ||
    text.includes('文創') ||
    text.includes('生活') ||
    q.category === '日常疑難'
  ) {
    track = 'cultural_services';
  } else {
    track = 'ict';
  }

  const resolvedCover = q.coverImage || (q as any).vibeCodingData?.coverImageUrl;
  const resolvedGallery = q.galleryImages || q.screenshots || (q as any).vibeCodingData?.screenshots || [];

  const combinedImgs = Array.from(
    new Set([resolvedCover, ...resolvedGallery].filter((u): u is string => Boolean(u && typeof u === 'string')))
  );

  const imgs =
    combinedImgs.length > 0
      ? combinedImgs
      : [generateTitleCover(q.id, q.appName || q.title)];

  return {
    id: q.id,
    appName: q.appName || deriveInnovationProposalName(q),
    title: q.title,
    stage: q.postType === 'pain_point' ? 'pain_point' : 'solution',
    track,
    summary: q.description.length > 90 ? `${q.description.slice(0, 90)}...` : q.description,
    description: q.description,
    authorId: q.authorId,
    authorName: q.authorName,
    authorAvatar: q.authorAvatar,
    authorRole: 'user',
    teamName: q.authorTitle ? `${q.authorName} ｜ ${q.authorTitle}` : q.authorName,
    organizationName: q.authorTitle,
    showOrganization: Boolean(q.authorTitle),
    sourcePainPointTitle: q.referencedPainPoint,
    referencedPainPoint: q.referencedPainPoint,
    targetGoal: q.targetGoal,
    images: imgs,
    youtubeUrl: q.youtubeUrl,
    coverMode: q.coverMode,
    cardHoverMode: q.cardHoverMode,
    proposalProgressStage: q.proposalProgressStage,
    externalLink: q.demoUrl,
    technicalFeasibility: q.techArchitecture,
    tags: q.tags,
    status: q.status === 'delisted' ? 'rejected' : 'approved',
    supportPoints:
      typeof q.supportPoints === 'number' && q.supportPoints > 0
        ? q.supportPoints < 2000
          ? q.supportPoints * 100
          : q.supportPoints
        : 0,
    supporterCount: typeof q.supporterCount === 'number' ? q.supporterCount : 0,
    targetFundingAmount: 100000,
    viewsCount: typeof q.views === 'number' ? q.views : 0,
    likeCount: typeof q.likes === 'number' ? q.likes : 0,
    commentsCount: typeof q.answersCount === 'number' ? q.answersCount : 0,
    createdAt: q.createdAt,
    updatedAt: q.updateLogs && q.updateLogs.length > 0 ? q.updateLogs[0].timestamp : q.createdAt,
    currentVersion: q.currentVersion,
    updateLogs: q.updateLogs,
  };
};

export const mapQuestionsToStarSeasonProposals = (
  questions: Question[]
): import('../types/competition').StarSeasonProposal[] => {
  return questions
    .filter((q) => isInnovationProposalQuestion(q) && q.status !== 'delisted')
    .map(questionToStarSeasonProposal);
};

/**
 * 判斷卡片內頁瀏覽次數是否對當前使用者可見：
 * 1. 若 showCardViews 為 false，全站與管理員皆不顯示。
 * 2. 若 cardViewsScope 為 'public'，所有人（含訪客、會員、管理員）皆可見。
 * 3. 若 cardViewsScope 為 'admin'（預設），僅具有管理員權限者可見。
 */
export const isCardViewsVisible = (
  config?: import('../types').PublicMetricsConfig | null,
  isAdmin: boolean = false
): boolean => {
  if (!config) return isAdmin;
  const isEnabled = config.showCardViews ?? true;
  if (!isEnabled) return false;
  const scope = config.cardViewsScope ?? 'admin';
  if (scope === 'public') return true;
  return isAdmin;
};

/**
 * 次分類與同義領域賽道之對照表
 * 解決競賽領域賽道（資通訊、機電運輸、生醫化材、服務文創）與主站分類（資訊科技、機械工業、生醫材料、文創工藝）
 * 以及歷史資料分類詞彙（法律諮詢/法律智財、財務會計/會計稅務等）在統計看板與過濾時的對應。
 */
export const SUBCATEGORY_SYNONYMS: Record<string, string[]> = {
  // 創新創業 / 創星季四大領域對照
  '資訊科技': ['資訊科技', '資通訊', 'AI智慧應用', 'SaaS雲端軟體', '物聯網軟硬整合', '資安與區塊鏈'],
  '資通訊': ['資訊科技', '資通訊', 'AI智慧應用', 'SaaS雲端軟體', '物聯網軟硬整合', '資安與區塊鏈'],
  '生醫材料': ['生醫材料', '生醫化材', '數位醫療健康', '生技製藥', '先進材料研發', '綠色環保化學', '生技醫療', '生醫健康'],
  '生醫化材': ['生醫材料', '生醫化材', '數位醫療健康', '生技製藥', '先進材料研發', '綠色環保化學', '生技醫療', '生醫健康'],
  '機械工業': ['機械工業', '機電運輸', '無人載具與智慧物流', '綠能微電網', '智慧製造', '電動車與交通', '硬體製造'],
  '機電運輸': ['機械工業', '機電運輸', '無人載具與智慧物流', '綠能微電網', '智慧製造', '電動車與交通', '硬體製造'],
  '服務餐飲': ['服務餐飲', '餐飲管理', '攤販餐車', '智慧餐飲'],
  '文創工藝': ['文創工藝', '服務文創', '生活服務商模', '文創IP設計', '共享經濟', '地方創生與ESG', '地方創生'],
  '服務文創': ['文創工藝', '服務文創', '生活服務商模', '文創IP設計', '共享經濟', '地方創生與ESG', '地方創生'],

  // 專業問題對照
  '法律智財': ['法律智財', '法律諮詢', '新創法務', '智財', '法規遵循', '著作權合約'],
  '會計稅務': ['會計稅務', '財務會計', '電商稅務', '稅務申報'],
  '企業管理': ['企業管理', '商業營運', '管理架構診斷', '行銷企劃', '組織轉型', 'B2B 轉型'],

  // 學術探討對照
  '生技醫療': ['生技醫療', '生醫健康', '生醫專利', '科研技轉'],
  '資訊工程': ['資訊工程', '工程技術', 'AI 演算法'],
  '社會科學': ['社會科學', '人文社會', '社會影響力評估', 'AI 倫理'],

  // 網站程式
  '網站程式': ['網站程式', '社群互動', '內容媒體', '電商服務', '管理後台', '形象展示', '實用工具'],
  'AI工具': ['AI工具', '智能助手', '知識問答', '圖像影音', '文本寫作', '代碼輔助', '數據分析'],
  '遊戲': ['遊戲', '小遊戲', '休閒派對', '模擬體驗', '策略益智', '多人冒險', '競技對戰', '卡牌桌遊'],
  '自動化': ['自動化', '流程整合', '資料爬取', '定時排程', '訊息機器人', '文件處理', '自動化工作流'],
  '擴充功能': ['擴充功能', '瀏覽器外掛', '開發套件', '效率增強', '介面美化', '輔助外掛'],
};

/**
 * 判斷問題是否符合目標次分類（支援同義詞對照、多次分類 subcategories 與 tags）
 */
export const matchesSubcategoryQuery = (q: Partial<Question>, targetSubcategory: string): boolean => {
  if (!targetSubcategory || targetSubcategory === '全部') return true;
  const synonyms = SUBCATEGORY_SYNONYMS[targetSubcategory] || [targetSubcategory];

  // 1. 直屬次分類
  if (q.subcategory && synonyms.includes(q.subcategory)) return true;

  // 2. 多重次分類陣列
  if (Array.isArray(q.subcategories) && q.subcategories.some((s) => synonyms.includes(s))) return true;

  // 3. 標籤
  if (Array.isArray(q.tags) && q.tags.some((t) => synonyms.includes(t) || t === targetSubcategory)) return true;

  // 4. 三級領域
  if (q.tertiaryCategory && synonyms.includes(q.tertiaryCategory)) return true;

  return false;
};



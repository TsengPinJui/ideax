/**
 * 創星季競賽時程與各階段功能開放/封鎖狀態管理
 * 
 * 嚴格遵循創星季最新時程與規則：
 * • 開放報名：10/17 00:00 開放線上報名參賽（至 12/04 16:30 截止）
 * • 第一階段：痛點徵件 (10/24 00:00 ~ 11/13 16:30，含當前開跑測試期)
 *   - 開放功能：首頁主按鈕「提出痛點」、創點子/痛點集瀏覽、校園推廣大使推薦
 *   - 限制功能：提案與模擬募資尚未開跑（於 11/14 開放預先提案）
 * • 第二階段 A：預先提案 (11/14 10:00 ~ 11/15 16:30)
 *   - 開放功能：註冊報名、申請參賽者/專家、在線提案、主辦單位審核、預覽提案
 *   - 關閉功能：募資(投資)功能關閉，僅供瀏覽與預覽，不可注資
 * • 第二階段 B：模擬募資與提案 (11/16 10:00 ~ 12/04 16:30，直到 12/04 16:30 截止)
 *   - 開放功能：註冊報名、我想提案（至 12/04 截止）、創星幣模擬募資(投資)注資投票、主辦單位審核
 * • 第三階段：進入決選 (12/05 ~ 12/11)
 *   - 開放功能：公布前 20 名入圍名單、創星季評審團與導師審查
 *   - 封鎖功能：提案已於 12/04 截止、模擬募資已於 12/04 截止
 * • 第四階段：公布結果 (12/12 ~ 12/16 最終榮譽榜單)
 *   - 開放功能：盛大公告最終榮譽榜單
 *   - 封鎖功能：提案與募資已截止
 */

export type CompetitionActiveStage = 0 | 1 | 2 | 3 | 4 | 5; // 0:籌備/即將開跑 1:痛點 2:預先提案 3:模擬募資 4:決選 5:公布

export interface CompetitionStageInfo {
  activeStage: number;           // 0:籌備/即將開跑 1:痛點 2:預先提案 3:模擬募資 4:決選 5:公布 (對應UI階梯或精細階段)
  timelineStep: 0 | 1 | 2 | 3 | 4 | 5;
  registrationPeriod: string;    // 報名時段：10/17 00:00 ~ 12/04 16:30
  registrationNote: string;      // 提痛點之參賽者請於 11/13 16:30 痛點徵件截止前完成報名
  isBeforeStart: boolean;        // 10/24 痛點徵件前尚未正式開跑
  isRegistrationOnlyStage: boolean; // 10/17 ~ 10/23 僅開放報名，尚未開放徵件
  isPainPointStage: boolean;     // 第一階段：痛點徵件 (10/24 00:00 ~ 11/13 16:30)
  isPreProposalStage: boolean;   // 預先提案期 (11/14 ~ 11/15)：關閉募資/投資，可報名/提案/審核/預覽
  isCrowdfundingActiveStage: boolean; // 模擬募資期 (11/16 ~ 12/04)：可報名/提案/募資投資/審核
  isProposalStage: boolean;      // 廣義提案開放期 (11/14 ~ 12/04)：包含預先提案與模擬募資期
  isExpertReviewStage: boolean;  // 第三階段：進入決選 (12/05 ~ 12/11)
  isResultsStage: boolean;       // 第四階段：公布結果 (12/12 之後)
  isProposalClosed: boolean;     // 12/04 之後提案封鎖
  isCrowdfundingClosed: boolean; // 12/04 之後模擬募資封鎖
  isInvestmentEnabled: boolean;  // 募資(投資)是否開放：僅在 11/16 ~ 12/04 開放，11/14~11/15 關閉！
  stageTitle: string;
  stagePeriod: string;
  ctaButtonText: string;
  ctaButtonSubtitle: string;
}

export function getCompetitionStageInfo(): CompetitionStageInfo {
  // 支援管理員/測試於本機手動覆寫階段 (方便預覽與驗證各階段行為)
  let override: string | null = null;
  try {
    if (typeof window !== 'undefined') {
      override = localStorage.getItem('ideax_competition_stage_override');
    }
  } catch {}

  const now = new Date();
  const currentYear = now.getFullYear();

  // 精確切點時間物件 (精確到分)
  // 10/17 00:00 報名開始
  const tRegistrationStart = new Date(currentYear, 9, 17, 0, 0, 0).getTime(); // 10/17 00:00
  // 10/24 00:00 ~ 11/13 16:30 痛點徵件
  const tPainPointStart = new Date(currentYear, 9, 24, 0, 0, 0).getTime();   // 10/24 00:00
  const tPainPointEnd = new Date(currentYear, 10, 13, 16, 30, 0).getTime(); // 11/13 16:30
  // 11/14 10:00 ~ 11/15 16:30 預先提案
  const tPreProposalStart = new Date(currentYear, 10, 14, 10, 0, 0).getTime(); // 11/14 10:00
  const tPreProposalEnd = new Date(currentYear, 10, 15, 16, 30, 0).getTime();   // 11/15 16:30
  // 11/16 10:00 ~ 12/04 16:30 模擬募資
  const tCrowdfundStart = new Date(currentYear, 10, 16, 10, 0, 0).getTime();   // 11/16 10:00
  const tCrowdfundEnd = new Date(currentYear, 11, 4, 16, 30, 0).getTime();      // 12/04 16:30
  // 12/05 ~ 12/11 進入決選 (評審)
  const tExpertReviewEnd = new Date(currentYear, 11, 11, 23, 59, 59).getTime(); // 12/11 23:59:59
  // 12/12 ~ 12/16 公布結果
  const tResultsEnd = new Date(currentYear, 11, 16, 23, 59, 59).getTime(); // 12/16 23:59:59

  const nowTime = now.getTime();
  let stage = 0;

  let forceRegOnly = false;
  if (override === 'stage0' || override === 'preparation') {
    stage = 0;
  } else if (override === 'stage0_reg' || override === 'registration' || override === 'registration_only') {
    stage = 0;
    forceRegOnly = true;
  } else if (override === 'stage1' || override === 'pain_point') {
    stage = 1;
  } else if (override === 'stage2_pre' || override === 'pre_proposal') {
    stage = 2; // 預先提案 (11/14 10:00 ~ 11/15 16:30)
  } else if (override === 'stage2' || override === 'crowdfunding' || override === 'proposal') {
    stage = 3; // 模擬募資 (11/16 10:00 ~ 12/04 16:30)
  } else if (override === 'stage3' || override === 'review') {
    stage = 4; // 決選 (12/05 ~ 12/11)
  } else if (override === 'stage4' || override === 'results') {
    stage = 5; // 公布 (12/12 ~ 12/16)
  } else {
    // 依精準詳細時程判定：
    // • 10/24 00:00 前：尚未進入第一階段痛點徵件 (籌備預熱/即將開跑，10/17起開放報名)
    // • 10/24 00:00 ~ 11/13 16:30：第一階段 痛點徵件 (開放「提出痛點」)
    // • 11/14 10:00 ~ 11/15 16:30：第二階段 (一) 預先提案（開放「我想提案!」，暫不可注資）
    // • 11/16 10:00 ~ 12/04 16:30：第二階段 (二) 模擬募資（開放「我想提案!」與注資，12/04 16:30 截止）
    // • 12/05 ~ 12/11：第三階段 進入決選評審 (提案正式截止)
    // • 12/12 ~ 12/16：第四階段 公布結果 (最終榮譽榜單)
    if (nowTime < tPainPointStart) {
      stage = 0; // 時間尚未到達 10/24 00:00，痛點徵件尚未開始！
    } else if (nowTime <= tPainPointEnd) {
      stage = 1;
    } else if (nowTime < tPreProposalStart) {
      // 11/13 16:30 ~ 11/14 10:00 空檔緩衝：過渡至預先提案準備期
      stage = 1;
    } else if (nowTime <= tPreProposalEnd) {
      stage = 2; // 預先提案
    } else if (nowTime < tCrowdfundStart) {
      // 11/15 16:30 ~ 11/16 10:00 空檔緩衝：延續預先提案狀態（不可投資）
      stage = 2;
    } else if (nowTime <= tCrowdfundEnd) {
      stage = 3; // 模擬募資
    } else if (nowTime <= tExpertReviewEnd) {
      stage = 4; // 進入決選
    } else {
      stage = 5; // 公布結果 (12/12 ~ 12/16)
    }
  }

  const isBeforeStart = stage === 0;
  const isRegistrationOnlyStage = (isBeforeStart && nowTime >= tRegistrationStart) || forceRegOnly;
  const isPainPointStage = stage === 1;
  const isPreProposalStage = stage === 2;
  const isCrowdfundingActiveStage = stage === 3;
  const isProposalStage = stage === 2 || stage === 3; // 11/14 10:00 ~ 12/04 16:30 均可提案
  const isExpertReviewStage = stage === 4;
  const isResultsStage = stage === 5;
  const isProposalClosed = stage >= 4;
  const isCrowdfundingClosed = stage >= 4;
  // 核心：預先提案期間 (11/14 10:00 ~ 11/15 16:30) 關閉募資(投資)功能；僅 11/16 10:00 ~ 12/04 16:30 開放投資！
  const isInvestmentEnabled = stage === 3;

  let stageTitle = '籌備預熱中（即將開跑）';
  let stagePeriod = '10/17 開放報名・10/24 00:00 痛點徵件開跑';
  let ctaButtonText = '即將開跑 (10/24)';
  let ctaButtonSubtitle = '10/24 00:00 痛點徵件正式開跑';

  if (isRegistrationOnlyStage) {
    stageTitle = '報名起跑中（痛點徵件即將開跑）';
    stagePeriod = '10/17 00:00 ~ 12/04 16:30 報名・10/24 徵件';
    ctaButtonText = '即將徵件 (10/24)';
    ctaButtonSubtitle = '線上報名已開跑・10/24 00:00 痛點徵件開跑';
  } else if (isPainPointStage) {
    stageTitle = '第一階段：痛點徵件';
    stagePeriod = '10/24 00:00 ~ 11/13 16:30';
    ctaButtonText = '提出痛點';
    ctaButtonSubtitle = '痛點徵件中 (過審送200點)';
  } else if (isPreProposalStage) {
    stageTitle = '第二階段 (一)：預先提案';
    stagePeriod = '11/14 10:00 ~ 11/15 16:30';
    ctaButtonText = '我想提案!';
    ctaButtonSubtitle = '預先提案開放中（暫不開放募資投資）';
  } else if (isCrowdfundingActiveStage) {
    stageTitle = '第二階段 (二)：模擬募資與提案';
    stagePeriod = '11/16 10:00 ~ 12/04 16:30';
    ctaButtonText = '我想提案!';
    ctaButtonSubtitle = '模擬募資進行中 (12/04 16:30 截止)';
  } else if (isExpertReviewStage) {
    stageTitle = '第三階段：進入決選(評審)';
    stagePeriod = '12/05 ~ 12/11';
    ctaButtonText = '提案已截止';
    ctaButtonSubtitle = '12/04 16:30已截止・現正決選評審中';
  } else if (isResultsStage) {
    stageTitle = '第四階段：公布結果';
    stagePeriod = '12/12 ~ 12/16';
    ctaButtonText = '提案已截止';
    ctaButtonSubtitle = '查看創星季最終榮譽榜單';
  }

  return {
    activeStage: stage,
    timelineStep: stage as 0 | 1 | 2 | 3 | 4 | 5,
    registrationPeriod: '10/17 00:00 ~ 12/04 16:30',
    registrationNote: '提痛點之參賽者請於 11/13 16:30 痛點徵件截止前完成報名',
    isBeforeStart,
    isRegistrationOnlyStage,
    isPainPointStage,
    isPreProposalStage,
    isCrowdfundingActiveStage,
    isProposalStage,
    isExpertReviewStage,
    isResultsStage,
    isProposalClosed,
    isCrowdfundingClosed,
    isInvestmentEnabled,
    stageTitle,
    stagePeriod,
    ctaButtonText,
    ctaButtonSubtitle,
  };
}

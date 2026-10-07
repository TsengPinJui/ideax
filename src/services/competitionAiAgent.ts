import { StarSeasonTrack, StarSeasonStage, OFFICIAL_COMPETITION_TRACKS } from '../types/competition';

export interface CompetitionAiTaggingResult {
  track: StarSeasonTrack;
  trackName: string;
  tags: string[];
  aiCategorized: boolean;
}

/**
  * AI 市場顧問 Agent：針對競賽痛點與創新提案自動分析賦予四大領域分類與標籤
  * 四大領域分類：機電運輸、資通訊、生醫化材、服務文創
  */
export async function analyzeCompetitionItemWithAgent(params: {
  title: string;
  summary: string;
  description: string;
  stage: StarSeasonStage;
  userTrack?: string;
}): Promise<CompetitionAiTaggingResult> {
  const { title, summary, description, stage, userTrack } = params;
  const fullText = `${title} ${summary} ${description}`.toLowerCase();

  // 若使用者已指定合法領域 (例如提案者必選，或痛點者主動選填)
  let finalTrack: StarSeasonTrack = 'ict';
  let aiCategorized = false;

  if (userTrack && ['mechanical_transport', 'ict', 'biomedical', 'cultural_services'].includes(userTrack)) {
    finalTrack = userTrack as StarSeasonTrack;
    aiCategorized = false;
  } else {
    // 痛點未選領域，由市場顧問 Agent 依題意語義關鍵字進行智慧判定
    aiCategorized = true;

    // 關鍵字特徵計分
    let scoreMech = 0;
    let scoreIct = 0;
    let scoreBio = 0;
    let scoreCult = 0;

    const mechKeywords = ['機械', '運輸', '載具', '車', '無人機', '馬達', '電網', '電路', '電力', '能源', '電池', '自動化', '硬體', '物聯網', '感測', '物流', '航太', '微電網'];
    const ictKeywords = ['ai', '人工智慧', '軟體', 'app', '雲端', '平台', '演算法', '晶片', '資安', '資料庫', '系統', 'saas', '區塊鏈', '程式', '資訊', '通訊', 'llm', '模型'];
    const bioKeywords = ['生醫', '生技', '醫療', '健康', '化學', '材料', '藥', '照護', '長照', '醫材', '檢測', '生物', '農業', '環保', '碳', '病蟲害', '快篩'];
    const cultKeywords = ['文創', '服務', '文化', '生活', '共享', '社群', '餐飲', '商業模式', '青年', '空間', '二手', '租借', '平台', '文旅', '地方創生', '品牌', '行銷'];

    mechKeywords.forEach((kw) => { if (fullText.includes(kw)) scoreMech += 2; });
    ictKeywords.forEach((kw) => { if (fullText.includes(kw)) scoreIct += 2; });
    bioKeywords.forEach((kw) => { if (fullText.includes(kw)) scoreBio += 2; });
    cultKeywords.forEach((kw) => { if (fullText.includes(kw)) scoreCult += 2; });

    const maxScore = Math.max(scoreMech, scoreIct, scoreBio, scoreCult);
    if (maxScore > 0) {
      if (maxScore === scoreBio) finalTrack = 'biomedical';
      else if (maxScore === scoreMech) finalTrack = 'mechanical_transport';
      else if (maxScore === scoreCult) finalTrack = 'cultural_services';
      else finalTrack = 'ict';
    } else {
      finalTrack = 'ict'; // 預設資通訊
    }
  }

  // 自動萃取 3~5 個精準標籤
  const extractedTags: string[] = [];

  // 依領域預設基礎標籤
  if (finalTrack === 'mechanical_transport') {
    extractedTags.push('機電自動化', '智慧運輸');
    if (fullText.includes('電網') || fullText.includes('能源') || fullText.includes('電力')) extractedTags.push('綠能微電網');
    if (fullText.includes('無人') || fullText.includes('無人機') || fullText.includes('飛行')) extractedTags.push('無人載具');
    if (fullText.includes('感測') || fullText.includes('雷達') || fullText.includes('iot')) extractedTags.push('智慧感測器');
  } else if (finalTrack === 'biomedical') {
    extractedTags.push('生醫健康', '精準醫療');
    if (fullText.includes('照護') || fullText.includes('長照') || fullText.includes('銀髮')) extractedTags.push('智慧長照');
    if (fullText.includes('晶片') || fullText.includes('快篩') || fullText.includes('檢測')) extractedTags.push('微流體快篩');
    if (fullText.includes('材料') || fullText.includes('奈米') || fullText.includes('環保')) extractedTags.push('綠色新材料');
  } else if (finalTrack === 'cultural_services') {
    extractedTags.push('生活服務創新', '商模驗證');
    if (fullText.includes('共享') || fullText.includes('雨傘') || fullText.includes('空間')) extractedTags.push('共享經濟');
    if (fullText.includes('餐飲') || fullText.includes('便當') || fullText.includes('外送') || fullText.includes('團購')) extractedTags.push('D2C社群拼單');
    if (fullText.includes('青年') || fullText.includes('校園') || fullText.includes('學生')) extractedTags.push('校園生態圈');
  } else {
    extractedTags.push('AI 演算法', '資通訊系統');
    if (fullText.includes('agent') || fullText.includes('代理人') || fullText.includes('llm')) extractedTags.push('AI Agent 代理人');
    if (fullText.includes('預測') || fullText.includes('數據') || fullText.includes('分析')) extractedTags.push('智能動態預測');
    if (fullText.includes('saas') || fullText.includes('雲端')) extractedTags.push('雲端 SaaS 平台');
  }

  // 去重並取前 4 個
  const uniqueTags = Array.from(new Set(extractedTags)).slice(0, 4);

  const trackMeta = OFFICIAL_COMPETITION_TRACKS.find((t) => t.id === finalTrack) || OFFICIAL_COMPETITION_TRACKS[0];

  return {
    track: finalTrack,
    trackName: trackMeta.name,
    tags: uniqueTags,
    aiCategorized,
  };
}

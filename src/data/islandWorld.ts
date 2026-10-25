import { AppTab, Question, SpecialZone } from '../types';
import { getEffectiveTertiaryCategory, isGameQuestion } from '../utils/gameClassification';

export type IslandAction =
  | 'home'
  | 'pain_feed'
  | 'discussion_feed'
  | 'vibecoding_feed'
  | 'ideas_feed'
  | 'jobs'
  | 'experts'
  | 'create_pain_point'
  | 'create_discussion'
  | 'create_app'
  | 'create_proposal';

export type IslandContentKind = 'questions' | 'jobs' | 'experts';
export type IslandContentSource = 'all' | 'pain' | 'discussion' | 'app' | 'proposal' | 'game' | 'jobs' | 'experts';
export type IslandDisplayTemplate = 'cards' | 'exhibits' | 'game_table' | 'scrolls' | 'job_board' | 'guild_roster';

export interface IslandMapPosition {
  x: number;
  y: number;
  size: 'small' | 'medium' | 'large';
  land: string;
  edge: string;
}

export interface IslandNpcProfile {
  name: string;
  role: string;
  greeting: string;
  action: IslandAction;
  actionLabel: string;
}

export interface IslandStand {
  id: string;
  typeId: string;
  name: string;
  sceneTemplateId: string;
  summary: string;
  sceneMood: string;
  palette: 'plaza' | 'gallery' | 'carnival' | 'command' | 'haunted' | 'mystery' | 'adventure' | 'arena' | 'storybook' | 'studio' | 'romance' | 'tavern' | 'problem' | 'market' | 'temple';
  decorations: string[];
  displayTemplate: IslandDisplayTemplate;
  npcProfile: IslandNpcProfile;
  interactionPrompt: string;
  contentKind: IslandContentKind;
  contentFilter: {
    source: IslandContentSource;
    category?: string;
    tertiaryCategory?: string;
  };
  navigationTarget: {
    tab: AppTab;
    specialZone?: SpecialZone;
  };
  audioProfile?: string;
  mobileFallback: string;
  parentIslandId: string;
  parentDistrictId: string;
  parentStreetId: string;
}

export interface IslandStreet {
  id: string;
  name: string;
  subtitle: string;
  stands: IslandStand[];
}

export interface IslandDistrict {
  id: string;
  name: string;
  subtitle: string;
  streets: IslandStreet[];
}

export interface IdeaXIsland {
  id: string;
  name: string;
  shortName: string;
  subtitle: string;
  icon: string;
  mapPosition: IslandMapPosition;
  districts: IslandDistrict[];
}

type StandSeed = Omit<IslandStand, 'parentIslandId' | 'parentDistrictId' | 'parentStreetId'>;
type StreetSeed = Omit<IslandStreet, 'stands'> & { stands: StandSeed[] };
type DistrictSeed = Omit<IslandDistrict, 'streets'> & { streets: StreetSeed[] };
type StandOptions = {
  category?: string;
  tertiaryCategory?: string;
  sceneMood?: string;
  contentKind?: IslandContentKind;
  navigationTarget?: IslandStand['navigationTarget'];
  interactionPrompt?: string;
  audioProfile?: string;
};

const stand = (
  id: string,
  name: string,
  source: IslandContentSource,
  sceneTemplateId: string,
  palette: IslandStand['palette'],
  decorations: string[],
  displayTemplate: IslandDisplayTemplate,
  summary: string,
  npcProfile: IslandNpcProfile,
  options: StandOptions = {},
): StandSeed => ({
  id,
  typeId: id,
  name,
  sceneTemplateId,
  summary,
  sceneMood: options.sceneMood || `${name}主題場景`,
  palette,
  decorations,
  displayTemplate,
  npcProfile,
  interactionPrompt: options.interactionPrompt || npcProfile.greeting,
  contentKind: options.contentKind || 'questions',
  contentFilter: { source, ...(options.category ? { category: options.category } : {}), ...(options.tertiaryCategory ? { tertiaryCategory: options.tertiaryCategory } : {}) },
  navigationTarget: options.navigationTarget || { tab: 'explore' },
  audioProfile: options.audioProfile,
  mobileFallback: '在手機上改以垂直場景卡片和清單呈現，所有入口皆可直接點選。',
});

const npc = (name: string, role: string, greeting: string, action: IslandAction, actionLabel: string): IslandNpcProfile => ({ name, role, greeting, action, actionLabel });

const gameScenes: Array<{
  category: string;
  template: string;
  palette: IslandStand['palette'];
  emoji: string[];
  summary: string;
  npc: IslandNpcProfile;
}> = [
  { category: '休閒派對', template: 'carnival-arcade', palette: 'carnival', emoji: ['🎡', '🎈', '🕹️', '🎉'], summary: '色彩明亮的遊樂園入口，收錄輕鬆上手、適合揪團同樂的作品。', npc: npc('樂樂', '遊樂園導覽員', '想先玩一局輕鬆的小遊戲嗎？我帶你看看園區裡的作品。', 'vibecoding_feed', '逛遊戲作品') },
  { category: '策略益智', template: 'strategy-command', palette: 'command', emoji: ['🗺️', '♟️', '🧭', '🎯'], summary: '指揮桌、棋盤與戰術地圖，讓需要規劃與推理的作品一眼可辨。', npc: npc('策策', '策略教官', '先看玩法和策略方向，再挑一款作品開始挑戰。', 'vibecoding_feed', '查看策略遊戲') },
  { category: '恐怖驚悚', template: 'haunted-corridor', palette: 'haunted', emoji: ['🏚️', '🕯️', '🌫️', '👁️'], summary: '霧色走廊、微弱燈光與懸疑線索，呈現恐怖驚悚作品的氣氛。', npc: npc('夜巡', '鬼屋守門人', '前方燈光不太穩定；準備好了再點開作品。', 'vibecoding_feed', '探索驚悚作品') },
  { category: '解謎劇情', template: 'mystery-room', palette: 'mystery', emoji: ['🔎', '🧩', '📜', '🗝️'], summary: '線索牆、拼圖桌和機關櫃，帶你沿著故事線索探索作品。', npc: npc('小線', '線索整理員', '想從哪個謎團開始？點選作品，沿著線索慢慢解開。', 'vibecoding_feed', '查看解謎作品') },
  { category: '多人冒險', template: 'adventure-base', palette: 'adventure', emoji: ['🧭', '🎒', '🗺️', '⛺'], summary: '探險基地備好地圖與裝備，展示冒險、探索和合作作品。', npc: npc('阿拓', '冒險領隊', '地圖和裝備都準備好了，挑一個目的地出發吧。', 'vibecoding_feed', '進入冒險基地') },
  { category: '競技對戰', template: 'battle-arena', palette: 'arena', emoji: ['🏆', '🥊', '⚡', '🎮'], summary: '擂台、計分板與對戰入口，集中展示競技挑戰類作品。', npc: npc('勝勝', '競技主持人', '挑一款作品，看看玩法與對戰節奏是否合你胃口。', 'vibecoding_feed', '查看競技作品') },
  { category: '親子兒童', template: 'storybook-town', palette: 'storybook', emoji: ['🏡', '🧸', '⭐', '🎨'], summary: '繪本小鎮與任務公告板，呈現適合親子一起探索的作品。', npc: npc('星芽', '小鎮嚮導', '這裡有適合一起玩的作品，也能先看看每款的介紹。', 'vibecoding_feed', '逛親子遊戲街') },
  { category: '模擬體驗', template: 'simulation-studio', palette: 'studio', emoji: ['🛠️', '🏪', '🪴', '📦'], summary: '工作桌和經營場景展示，呈現料理、生活與經營模擬作品。', npc: npc('匠匠', '體驗工坊主理人', '選一個工作台，看看有哪些模擬體驗作品。', 'vibecoding_feed', '查看模擬作品') },
  { category: '卡牌桌遊', template: 'boardgame-tavern', palette: 'tavern', emoji: ['🃏', '🍺', '🎲', '👥'], summary: '木梁酒館、圍桌座席、攤開的卡牌與骰子，聚集適合多人同樂的桌遊作品。', npc: npc('牌牌', '酒館桌主', '桌邊還有空位。來看看卡牌和桌遊作品，找朋友一起開局。', 'vibecoding_feed', '逛卡牌桌遊') },
  { category: '甜蜜浪漫', template: 'romance-garden', palette: 'romance', emoji: ['💌', '🌷', '💖', '🌙'], summary: '花園步道、信件與柔和燈光，展示甜蜜互動與浪漫故事作品。', npc: npc('心心', '花園信使', '沿著花園散步，挑一個故事開始體驗。', 'vibecoding_feed', '探索浪漫作品') },
];

function attachParents(islandId: string, districts: DistrictSeed[]): IslandDistrict[] {
  return districts.map((district) => ({
    ...district,
    streets: district.streets.map((street) => ({
      ...street,
      stands: street.stands.map((item) => ({
        ...item,
        parentIslandId: islandId,
        parentDistrictId: district.id,
        parentStreetId: street.id,
      })),
    })),
  }));
}

const createIsland = (
  id: string,
  name: string,
  shortName: string,
  subtitle: string,
  icon: string,
  mapPosition: IslandMapPosition,
  districts: DistrictSeed[],
): IdeaXIsland => ({ id, name, shortName, subtitle, icon, mapPosition, districts: attachParents(id, districts) });

const gamesDistrict: DistrictSeed = {
  id: 'creative-arcade',
  name: '電玩城',
  subtitle: '依遊戲分類逛街，進入不同主題場景',
  streets: gameScenes.map((game) => ({
    id: `game-street-${game.category}`,
    name: `${game.category}街`,
    subtitle: game.summary,
    stands: [stand(`game-${game.category}`, `${game.category}遊戲攤`, 'game', game.template, game.palette, game.emoji, 'game_table', game.summary, game.npc, { tertiaryCategory: game.category, navigationTarget: { tab: 'explore', specialZone: 'vibecoding' } })],
  })),
};

const rawIslands: IdeaXIsland[] = [
  createIsland('home', '主島', '中央廣場', '從這裡出發，探索 IdeaX 的內容與服務。', '🏛️', { x: 50, y: 48, size: 'large', land: '#d9c797', edge: '#a77c53' }, [
    { id: 'main-plaza', name: '中央廣場', subtitle: '最新內容與全站探索', streets: [{ id: 'main-latest-street', name: '探索大道', subtitle: '直接逛全站真實內容', stands: [stand('main-latest', '最新內容看板', 'all', 'central-plaza', 'plaza', ['📰', '💡', '🧭'], 'cards', '沿著中央廣場的公告欄瀏覽 IdeaX 目前公開的內容。', npc('多慧', '創點島導覽員', '想先看看大家最近提出的問題、討論和作品嗎？', 'home', '回傳統首頁'), { navigationTarget: { tab: 'explore' } })] }] },
    { id: 'main-guide-center', name: '探索導覽中心', subtitle: '快速前往主要功能', streets: [{ id: 'main-quick-street', name: '功能導覽街', subtitle: '從使用需求選擇入口', stands: [stand('main-quick-guide', 'IdeaX 功能入口', 'all', 'guide-center', 'plaza', ['🗺️', '✨', '📍'], 'cards', '依照想做的事，快速前往原網站的對應功能。', npc('多慧', '創點島導覽員', '從島嶼或功能選一個入口，就能接上原有網站流程。', 'home', '看全站內容'))] }] },
  ]),
  createIsland('creative', '創意島', '創意島', '展覽館與電玩城，發現軟體作品、遊戲和提案。', '💡', { x: 28, y: 68, size: 'large', land: '#b8cf9b', edge: '#6f9666' }, [
    { id: 'creative-exhibition', name: '展覽館', subtitle: '作品、AI 工具與創新提案展區', streets: [
      { id: 'creative-ai-street', name: 'AI 工具街', subtitle: '探索 AI 應用與工具作品', stands: [stand('creative-ai-tools', 'AI 工具展櫃', 'app', 'future-lab', 'gallery', ['🤖', '🧪', '✨'], 'exhibits', '在未來實驗室展示 AI 工具與應用作品。', npc('小艾', '實驗室研究員', '想找 AI 工具或看看創作者的新作品嗎？', 'vibecoding_feed', '查看 AI 工具'), { category: 'AI工具', navigationTarget: { tab: 'explore', specialZone: 'vibecoding' } })] },
      { id: 'creative-software-street', name: '軟體應用街', subtitle: '網站程式與實用工具作品', stands: [stand('creative-software', '軟體作品展櫃', 'app', 'software-gallery', 'gallery', ['🖥️', '🧰', '🌐'], 'exhibits', '以展品卡片呈現已發布的軟體網站作品。', npc('程程', '展覽館員', '點選展品即可查看 IdeaX 上的作品介紹。', 'vibecoding_feed', '逛軟體展覽館'), { navigationTarget: { tab: 'explore', specialZone: 'vibecoding' } })] },
      { id: 'creative-proposal-street', name: '創新提案街', subtitle: '想法、進度與合作提案', stands: [stand('creative-proposals', '創新提案展板', 'proposal', 'proposal-gallery', 'gallery', ['📋', '💡', '🤝'], 'exhibits', '查看 IdeaX 使用者公開的創新提案與合作構想。', npc('提提', '提案策展人', '一起看看正在發展中的創新點子。', 'ideas_feed', '瀏覽創新提案'), { navigationTarget: { tab: 'explore', specialZone: 'create_ideas' } })] },
    ] },
    gamesDistrict,
  ]),
  createIsland('pain', '痛點島', '痛點島', '從真實問題出發，探索痛點、需求與懸賞。', '🔥', { x: 26, y: 38, size: 'medium', land: '#dfb98c', edge: '#b37b57' }, [
    { id: 'pain-innovation-tower', name: '創點樓', subtitle: '走進老酒樓，說說你遇到的難題', streets: [{ id: 'pain-point-street', name: '問題卷軸街', subtitle: '看看酒樓公告牆上的真實需求', stands: [stand('pain-point-board', '創點樓大堂', 'pain', 'innovation-tower', 'problem', ['🧾', '🪵', '💬'], 'scrolls', '老式酒樓裡的長桌與公告牆，收錄使用者發布的真實痛點。', npc('掌櫃阿點', '創點樓掌櫃', '客官，先看看樓裡的公告；若你也有難題，我替你記下來。', 'create_pain_point', '寫下我的難題'), { sceneMood: '古代傳統酒樓', navigationTarget: { tab: 'explore', specialZone: 'pain_points' }, interactionPrompt: '翻看公告牆上的真實需求，或請掌櫃協助發布你的難題。' })] }] },
    { id: 'pain-needs-board', name: '需求公告區', subtitle: '依生活情境和分類尋找需求', streets: [{ id: 'pain-needs-street', name: '需求分類街', subtitle: '查看各領域提出的問題', stands: [stand('pain-needs', '需求分類公告牆', 'pain', 'needs-board', 'problem', ['📌', '🗒️', '🔖'], 'scrolls', '依 IdeaX 現有公開痛點貼文呈現需求內容。', npc('小需', '需求整理員', '點選一張卷軸可查看完整問題和回覆。', 'pain_feed', '瀏覽痛點') , { navigationTarget: { tab: 'explore', specialZone: 'pain_points' } })] }] },
  ]),
  createIsland('discussion', '討論島', '討論島', '走進日常、技術與學術街，加入真實討論。', '💬', { x: 76, y: 35, size: 'medium', land: '#e2cc99', edge: '#b59161' }, [
    { id: 'discussion-market', name: '討論市集', subtitle: '每條主題街都連結原有討論內容', streets: [
      { id: 'discussion-daily-street', name: '日常街', subtitle: '生活話題與日常疑問', stands: [stand('discussion-daily', '日常交流攤', 'discussion', 'discussion-market', 'market', ['☕', '📰', '💬'], 'cards', '用輕鬆的市集攤位瀏覽日常交流內容。', npc('小聊', '市集招呼員', '最近大家在聊什麼？來看一看，也歡迎加入討論。', 'discussion_feed', '逛討論市集'), { category: '日常疑難', navigationTarget: { tab: 'explore', specialZone: 'l0_discussion' } })] },
      { id: 'discussion-tech-street', name: '技術街', subtitle: '程式、工程與技術交流', stands: [stand('discussion-tech', '技術交流攤', 'discussion', 'maker-market', 'market', ['⚙️', '💻', '🛠️'], 'cards', '以工程師創客街的工具台和技術交流看板呈現討論。', npc('阿工', '創客街嚮導', '技術問題可以從標題與分類開始找，點進貼文接續討論。', 'discussion_feed', '查看技術討論'), { category: '專業問題', navigationTarget: { tab: 'explore', specialZone: 'l0_discussion' } })] },
      { id: 'discussion-academic-street', name: '學術街', subtitle: '學術探討與知識交流', stands: [stand('discussion-academic', '知識圖書攤', 'discussion', 'knowledge-library', 'market', ['📚', '🔬', '🧠'], 'cards', '書架、研究筆記與學術討論內容相連。', npc('知知', '知識館員', '可以依問題標題和分類，找到正在交流的主題。', 'discussion_feed', '瀏覽學術討論'), { category: '學術探討', navigationTarget: { tab: 'explore', specialZone: 'l0_discussion' } })] },
    ] },
  ]),
  createIsland('career', '徵才島', '徵才島', '使用既有職缺搜尋與專家媒合服務。', '🧧', { x: 76, y: 65, size: 'medium', land: '#d6a68d', edge: '#a86d57' }, [
    { id: 'career-temple', name: '職涯祈願廟', subtitle: '按條件搜尋真實職缺', streets: [{ id: 'career-jobs-street', name: '職缺榜街', subtitle: '開啟原有 AI 獵頭職缺搜尋', stands: [stand('career-job-search', '職缺推薦籤', 'jobs', 'career-temple', 'temple', ['🧧', '🪭', '📜'], 'job_board', '以祈願廟與職缺榜呈現入口；實際搜尋仍由 IdeaX 既有職缺服務處理。', npc('月老職涯官', '職涯指引 NPC', '告訴我你的地區、職務或工作型態，我們從真實職缺開始搜尋。', 'jobs', '開始找職缺'), { contentKind: 'jobs', navigationTarget: { tab: 'job_explorer' }, interactionPrompt: '抽籤只作為導覽儀式；職缺與條件比對由既有職缺搜尋提供。', audioProfile: 'quiet-temple' })] }] },
    { id: 'career-guild', name: '人才公會', subtitle: '尋找專家與媒合服務', streets: [{ id: 'career-experts-street', name: '專家媒合街', subtitle: '查看既有專家智庫名冊', stands: [stand('career-experts', '專家人才榜', 'experts', 'expert-guild', 'temple', ['🛡️', '🤝', '🏅'], 'guild_roster', '連接 IdeaX 現有專家名冊與媒合頁面。', npc('公會接待員', '人才公會嚮導', '想找特定領域的專家嗎？進入名冊查看專長與媒合方式。', 'experts', '瀏覽專家名冊'), { contentKind: 'experts', navigationTarget: { tab: 'solvers' } })] }] },
  ]),
];

export const IDEAX_ISLANDS: IdeaXIsland[] = rawIslands;

export function getIslandById(id: string): IdeaXIsland | undefined {
  return IDEAX_ISLANDS.find((island) => island.id === id);
}

export function getStandById(id: string): IslandStand | undefined {
  for (const island of IDEAX_ISLANDS) {
    for (const district of island.districts) {
      for (const street of district.streets) {
        const result = street.stands.find((item) => item.id === id);
        if (result) return result;
      }
    }
  }
  return undefined;
}

export function matchesIslandContent(question: Question, filter: IslandStand['contentFilter']): boolean {
  const sourceMatches = (() => {
    switch (filter.source) {
      case 'all': return true;
      case 'pain': return question.postType === 'pain_point' || question.specialZone === 'pain_points';
      case 'discussion': return question.postType === 'chat_discussion' || question.specialZone === 'l0_discussion';
      case 'app': return question.postType === 'vibecoding_app' || question.specialZone === 'vibecoding';
      case 'proposal': return question.postType === 'innovation_proposal';
      case 'game': return (question.postType === 'vibecoding_app' || question.specialZone === 'vibecoding') && isGameQuestion(question);
      case 'jobs':
      case 'experts': return false;
      default: return false;
    }
  })();
  if (!sourceMatches) return false;
  if (filter.category && question.category !== filter.category) return false;
  if (filter.tertiaryCategory && getEffectiveTertiaryCategory(question) !== filter.tertiaryCategory) return false;
  return question.status !== 'delisted';
}

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
  createIsland('home', '主島', '中央廣場', '從這裡出發，探索 IdeaX 的內容與服務。', '🏛️', { x: 50, y: 50, size: 'large', land: '#d9c797', edge: '#a77c53' }, [
    { id: 'main-plaza', name: '中央廣場', subtitle: '最新內容與全站探索', streets: [
      { id: 'main-latest-street', name: '探索大道', subtitle: '直接逛全站真實內容', stands: [stand('main-latest', '最新內容看板', 'all', 'central-plaza', 'plaza', ['📰', '💡', '🧭'], 'cards', '沿著中央廣場的公告欄瀏覽 IdeaX 目前公開的內容。', npc('多慧', '創點島導覽員', '想先看看大家最近提出的問題、討論和作品嗎？', 'home', '看全站內容'), { navigationTarget: { tab: 'explore' } })] },
      { id: 'main-quick-street', name: '功能導覽街', subtitle: '從使用需求選擇入口', stands: [stand('main-quick-guide', 'IdeaX 功能入口', 'all', 'guide-center', 'plaza', ['🗺️', '✨', '📍'], 'cards', '依照想做的事，快速前往原網站的對應功能。', npc('多慧', '創點島導覽員', '從島嶼或功能選一個入口，就能接上原有網站流程。', 'home', '看全站內容'))] },
    ] },
    { id: 'main-trade', name: '貿易街', subtitle: '商案商品交易與專案競標（暫未開放）', streets: [
      { id: 'main-trade-street', name: '貿易大道', subtitle: '專案交易與競標市集', stands: [stand('main-trade-market', '貿易市集（暫未開放）', 'all', 'guide-center', 'plaza', ['🪙', '⚖️', '📦'], 'cards', '貿易街專案商品交易與專案競標市集籌備中，暫未開放。', npc('貿易掌事', '貿易街掌事', '貿易街目前正在籌備建設中，標示暫未開放，敬請期待後續功能！', 'home', '暫未開放'), { interactionPrompt: '貿易街目前籌備中，暫未對外開放。' })] },
    ] },
  ]),
  createIsland('creative', '創意島', '創意島', '展覽館與電玩城，發現軟體作品、遊戲和提案。', '💡', { x: 8, y: 92, size: 'large', land: '#b8cf9b', edge: '#6f9666' }, [
    { id: 'creative-exhibition', name: '展覽館', subtitle: '作品、AI 工具與創新提案展區', streets: [
      { id: 'creative-ai-street', name: 'AI 工具街', subtitle: '探索 AI 應用與工具作品', stands: [stand('creative-ai-tools', 'AI 工具展櫃', 'app', 'future-lab', 'gallery', ['🤖', '🧪', '✨'], 'exhibits', '在未來實驗室展示 AI 工具與應用作品。', npc('小艾', '實驗室研究員', '想找 AI 工具或看看創作者的新作品嗎？', 'vibecoding_feed', '查看 AI 工具'), { category: 'AI工具', navigationTarget: { tab: 'explore', specialZone: 'vibecoding' } })] },
      { id: 'creative-software-street', name: '軟體應用街', subtitle: '網站程式與實用工具作品', stands: [stand('creative-software', '軟體作品展櫃', 'app', 'software-gallery', 'gallery', ['🖥️', '🧰', '🌐'], 'exhibits', '以展品卡片呈現已發布的軟體網站作品。', npc('程程', '展覽館員', '點選展品即可查看 IdeaX 上的作品介紹。', 'vibecoding_feed', '逛軟體展覽館'), { navigationTarget: { tab: 'explore', specialZone: 'vibecoding' } })] },
      { id: 'creative-proposal-street', name: '創新提案街', subtitle: '想法、進度與合作提案', stands: [stand('creative-proposals', '創新提案展板', 'proposal', 'proposal-gallery', 'gallery', ['📋', '💡', '🤝'], 'exhibits', '查看 IdeaX 使用者公開的創新提案與合作構想。', npc('提提', '提案策展人', '一起看看正在發展中的創新點子。', 'ideas_feed', '瀏覽創新提案'), { navigationTarget: { tab: 'explore', specialZone: 'create_ideas' } })] },
    ] },
    gamesDistrict,
  ]),
  createIsland('pain', '痛點島', '痛點島', '從真實問題出發，探索痛點、需求與懸賞。', '🔥', { x: 8, y: 8, size: 'large', land: '#dfb98c', edge: '#b37b57' }, [
    { id: 'pain-innovation-tower', name: '創點樓', subtitle: '走進老酒樓，說說你遇到的難題', streets: [{ id: 'pain-point-street', name: '問題卷軸街', subtitle: '看看酒樓公告牆上的真實需求', stands: [stand('pain-point-board', '創點樓大堂', 'pain', 'innovation-tower', 'problem', ['🧾', '🪵', '💬'], 'scrolls', '老式酒樓裡的長桌與公告牆，收錄使用者發布的真實痛點。', npc('掌櫃阿點', '創點樓掌櫃', '客官，先看看樓裡的公告；若你也有難題，我替你記下來。', 'create_pain_point', '寫下我的難題'), { sceneMood: '古代傳統酒樓', navigationTarget: { tab: 'explore', specialZone: 'pain_points' }, interactionPrompt: '翻看公告牆上的真實需求，或請創點樓掌櫃協助發布你的難題。' })] }] },
    { id: 'pain-needs-board', name: '需求公告區', subtitle: '依生活情境和分類尋找需求', streets: [{ id: 'pain-needs-street', name: '需求分類街', subtitle: '查看各領域提出的問題', stands: [stand('pain-needs', '需求分類公告牆', 'pain', 'needs-board', 'problem', ['📌', '🗒️', '🔖'], 'scrolls', '依 IdeaX 現有公開痛點貼文呈現需求內容。', npc('掌櫃阿點', '創點樓掌櫃', '客官請點選一張卷軸查看完整痛點與回覆。', 'pain_feed', '瀏覽痛點') , { navigationTarget: { tab: 'explore', specialZone: 'pain_points' } })] }] },
  ]),
  createIsland('discussion', '討論島', '討論島', '走進日常討論街、技術工作坊與知識圖書館。', '💬', { x: 92, y: 8, size: 'large', land: '#e2cc99', edge: '#b59161' }, [
    { id: 'discussion-daily-district', name: '日常討論街', subtitle: '生活話題交流，每個討論卡片為一攤', streets: [
      { id: 'discussion-daily-street', name: '交流攤位街', subtitle: '生活、職場與休閒話題', stands: [stand('discussion-daily', '日常交流各攤', 'discussion', 'discussion-market', 'market', ['☕', '📰', '💬'], 'cards', '生活市集，每個討論卡片即為一個交流攤位。', npc('小聊', '市集攤主', '來逛逛各個交流攤位，看看大家都在聊什麼。', 'discussion_feed', '逛討論市集'), { category: '日常疑難', navigationTarget: { tab: 'explore', specialZone: 'l0_discussion' } })] },
    ] },
    { id: 'discussion-tech-district', name: '技術交流', subtitle: '創客工作坊，每個卡片以桌為單位', streets: [
      { id: 'discussion-tech-street', name: '工作坊交流桌', subtitle: '程式、架構與技術切磋', stands: [stand('discussion-tech', '技術交流工作坊（各桌）', 'discussion', 'maker-market', 'market', ['⚙️', '💻', '🛠️'], 'cards', '創客工作坊，每個討論卡片以交流桌為單位開桌探討。', npc('阿工', '工作坊桌主', '技術交流工作坊已備好各桌，挑一桌坐下切磋。', 'discussion_feed', '查看技術交流桌'), { category: '專業問題', navigationTarget: { tab: 'explore', specialZone: 'l0_discussion' } })] },
    ] },
    { id: 'discussion-academic-district', name: '圖書館', subtitle: '學術探討，每個卡片以研討室為單位', streets: [
      { id: 'discussion-academic-street', name: '學術研討室', subtitle: '學術研究與深度理論探討', stands: [stand('discussion-academic', '學術研討室（各室）', 'discussion', 'knowledge-library', 'market', ['📚', '🔬', '🧠'], 'cards', '圖書館研討區，每個卡片以獨立研討室為單位探討學術論點。', npc('知知', '圖書館長', '研討室內正在進行學術探討，歡迎進入研讀。', 'discussion_feed', '進入學術研討室'), { category: '學術探討', navigationTarget: { tab: 'explore', specialZone: 'l0_discussion' } })] },
    ] },
  ]),
  createIsland('career', '徵才島', '徵才島', '進求職廟向廟公許願，或入翰林院查閱專家各庫。', '🧧', { x: 92, y: 92, size: 'large', land: '#d6a68d', edge: '#a86d57' }, [
    { id: 'career-temple-district', name: '求職廟', subtitle: '求職廟廟公聆聽需求，記錄並在匯職缺精準找工作', streets: [
      { id: 'career-temple-street', name: '求職廟大殿', subtitle: '向廟公許下求職期望', stands: [stand('career-temple-main', '求職廟正殿', 'jobs', 'career-temple', 'temple', ['🧧', '🪭', '📜'], 'job_board', '走入求職廟，向廟公許下求職期望，廟公將為您紀錄並於匯職缺精準找工作。', npc('廟公', '求職廟 廟公', '信士請進。向老朽說說您的專業專長、期望地區與理想職缺，我替您記下並在全網匯職缺為您尋得良機。', 'jobs', '向廟公許願找工作'), { contentKind: 'jobs', navigationTarget: { tab: 'job_explorer' }, interactionPrompt: '廟公將聆聽您的求職需求並紀錄，用來在匯職缺為您精準比對工作。', audioProfile: 'quiet-temple' })] },
    ] },
    { id: 'career-hanlin-district', name: '翰林院', subtitle: '專家智庫，院內分門別類，以各大智庫分藏專家名冊', streets: [
      { id: 'hanlin-tech-street', name: '資訊科技庫', subtitle: '軟體開發、AI 人工智慧與雲端架構專家', stands: [stand('hanlin-tech', '資訊科技庫專家名冊', 'experts', 'expert-guild', 'temple', ['💻', '🤖', '☁️'], 'guild_roster', '翰林院資訊科技庫，收錄演算法、前後端、大數據與 AI 實戰專家。', npc('院士', '翰林院學士', '科技庫收納全站頂尖工程專家，請查閱名冊。', 'experts', '查閱科技庫專家'), { contentKind: 'experts', category: '技術開發', navigationTarget: { tab: 'solvers' } })] },
      { id: 'hanlin-biz-street', name: '商業經營庫', subtitle: '商業策略、跨國行銷與品牌經營顧問', stands: [stand('hanlin-biz', '商業經營庫專家名冊', 'experts', 'expert-guild', 'temple', ['📈', '💼', '🌐'], 'guild_roster', '翰林院商業經營庫，匯聚商業模式、融資與市場拓銷名師。', npc('院士', '翰林院學士', '商業庫收錄各領域資深顧問，隨時可發起諮詢。', 'experts', '查閱商業庫專家'), { contentKind: 'experts', category: '商業職場', navigationTarget: { tab: 'solvers' } })] },
      { id: 'hanlin-biomed-street', name: '生醫療材庫', subtitle: '生醫科技、醫療器材法規與臨床研究專家', stands: [stand('hanlin-biomed', '生醫療材庫專家名冊', 'experts', 'expert-guild', 'temple', ['🧬', '🔬', '🏥'], 'guild_roster', '翰林院生醫療材庫，專門對接生醫檢驗、醫材認證與前瞻研發專家。', npc('院士', '翰林院學士', '生醫庫匯聚醫學與生技前瞻人才。', 'experts', '查閱生醫庫專家'), { contentKind: 'experts', navigationTarget: { tab: 'solvers' } })] },
      { id: 'hanlin-design-street', name: '創意設計庫', subtitle: 'UI/UX 產品體驗、工業設計與多媒體專家', stands: [stand('hanlin-design', '創意設計庫專家名冊', 'experts', 'expert-guild', 'temple', ['🎨', '✨', '📐'], 'guild_roster', '翰林院創意設計庫，專注介面體驗、品牌識別與工業造物設計師。', npc('院士', '翰林院學士', '設計庫網羅美學與體驗高手。', 'experts', '查閱設計庫專家'), { contentKind: 'experts', category: '創意設計', navigationTarget: { tab: 'solvers' } })] },
      { id: 'hanlin-legal-street', name: '法律智財庫', subtitle: '智慧財產權、專利佈局與商務法規顧問', stands: [stand('hanlin-legal', '法律智財庫專家名冊', 'experts', 'expert-guild', 'temple', ['⚖️', '📜', '🛡️'], 'guild_roster', '翰林院法律智財庫，保駕護航技術專利、合約爭議與商標法規。', npc('院士', '翰林院學士', '智財庫為您的創意點子構築法律專利防線。', 'experts', '查閱法規庫專家'), { contentKind: 'experts', navigationTarget: { tab: 'solvers' } })] },
    ] },
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

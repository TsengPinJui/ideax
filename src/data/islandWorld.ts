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
    subcategoryKeyword?: string;
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

export interface HanlinExpertProfile {
  id: string;
  thinkTankId: string;
  thinkTankName: string;
  name: string;
  title: string;
  avatar: string;
  bio: string;
  skills: string[];
  featuredCaseTitle?: string;
  featuredCaseOutcome?: string;
  solverId?: string;
}

export const HANLIN_EXPERT_ROSTER: HanlinExpertProfile[] = [
  // 人才獵頭/媒合專家
  {
    id: 'expert-headhunter-1',
    thinkTankId: 'hanlin-headhunter-street',
    thinkTankName: '人才獵頭/媒合專家',
    name: '周承翰',
    title: '科技獵頭總監 / 職涯策略諮詢師',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    bio: '10 年軟體與半導體高階獵才歷練，專精研發核心團隊組建、高階主管尋訪與跨領域專家精準媒合。',
    skills: ['高階獵才尋訪', '研發團隊組建', '薪資結構談判', '跨域專家媒合'],
    featuredCaseTitle: '協助 AI 新創 45 天內組建核心演算法與產品團隊',
    featuredCaseOutcome: '精準媒合首席架構師與 4 名資深工程師，首年留任率 100%。',
    solverId: 'solver-6',
  },
  {
    id: 'expert-headhunter-2',
    thinkTankId: 'hanlin-headhunter-street',
    thinkTankName: '人才獵頭/媒合專家',
    name: '林姿妤 Evelyn',
    title: '跨國企業首席獵才顧問 / 組織發展與人才媒合專家',
    avatar: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150&auto=format&fit=crop&q=80',
    bio: '專注亞太區新創與上市科技集團 C-level 高階獵頭、技術合夥人 (Co-founder) 媒合及海外人才引進。',
    skills: ['C-Level 獵頭', '技術合夥人媒合', '跨國人才配置', '雇主品牌建立'],
    featuredCaseTitle: '跨國 SaaS 台灣研發中心從 0 到 30 人關鍵獵才專案',
    featuredCaseOutcome: '3 個月內完成 VP of Engineering 及核心團隊招募到職。',
  },
  {
    id: 'expert-headhunter-3',
    thinkTankId: 'hanlin-headhunter-street',
    thinkTankName: '人才獵頭/媒合專家',
    name: '鄭博元 Marcus',
    title: '產學技術經紀人 / 專案外包與顧問團媒合總監',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    bio: '擅長針對企業轉型痛點，快速診斷所需技術棧並從智庫媒合最適任之架構師、設計師與產業顧問團隊。',
    skills: ['技術顧問媒合', '專案團隊組建', '產學研發對接', '數位轉型診斷'],
    featuredCaseTitle: '傳統製造業數位轉型跨領域顧問團媒合',
    featuredCaseOutcome: '媒合 AI 視覺與機電整合雙專家協作，縮短產線驗收期 50%。',
  },

  // 資訊科技庫
  {
    id: 'expert-tech-1',
    thinkTankId: 'hanlin-tech-street',
    thinkTankName: '資訊科技庫',
    name: '張維哲',
    title: 'AI 解決方案架構師 / 雲端全端資深工程師',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    bio: '專門解決企業導入大語言模型時的幻覺、Token 成本優化與私有化 RAG 知識庫權限隔離架構。',
    skills: ['LLM 應用', 'RAG 知識庫', '高併發架構', '向量資料庫', '成本優化'],
    featuredCaseTitle: '智慧法務合約檢索系統私有化架構',
    featuredCaseOutcome: '以混合檢索 + 語意快取，將推理成本壓低 72%，精準度維持在 94% 以上。',
    solverId: 'solver-3',
  },
  {
    id: 'expert-tech-2',
    thinkTankId: 'hanlin-tech-street',
    thinkTankName: '資訊科技庫',
    name: '陳怡君',
    title: '資深全端系統架構師 / AI 應用工程顧問',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    bio: '專注高併發微服務、AI Agent 落地整合與大型系統資安評估，擅長從技術角度提供破局解方。',
    skills: ['AI Agent 整合', '微服務架構', '系統性能調優', '高併發設計'],
    featuredCaseTitle: '大型電商雙十一高併發微服務重構',
    featuredCaseOutcome: '每秒交易承載量提升 4 倍，雲端主機成本下降 35%。',
  },
  {
    id: 'expert-tech-3',
    thinkTankId: 'hanlin-tech-street',
    thinkTankName: '資訊科技庫',
    name: '林志豪 Leo',
    title: '資深全端系統架構師 / 微服務與 DevOps 專家',
    avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80',
    bio: '深耕雲端原生架構、Kubernetes 自動化部署與 IoT 邊緣運算軟硬體整合方案。',
    skills: ['DevOps', 'Kubernetes', 'IoT 軟硬整合', '雲端資安'],
    featuredCaseTitle: '24 小時無人智慧空間 3D ToF 防尾隨系統整合',
    featuredCaseOutcome: '12 萬預算內完成零死角自動化門禁與雲端異常推播。',
  },

  // 商業經營庫
  {
    id: 'expert-biz-1',
    thinkTankId: 'hanlin-biz-street',
    thinkTankName: '商業經營庫',
    name: '柯育任',
    title: '前知名外送平台產品總監 / 新創商業策略顧問',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    bio: '8 年新創產品從 0 到 1 實戰經驗。專精共享硬體營運、B2B 商家廣告分成協議與雙邊市場冷啟動。',
    skills: ['產品策略', '雙邊市場冷啟動', '商業模式診斷', '異業聯盟分成'],
    featuredCaseTitle: '校園共享空間 3 個月翻倍單車位月坪效',
    featuredCaseOutcome: '透過周邊店家優惠券置換，周邊導流收益達 70%。',
    solverId: 'solver-1',
  },
  {
    id: 'expert-biz-2',
    thinkTankId: 'hanlin-biz-street',
    thinkTankName: '商業經營庫',
    name: '陳美琪 Maggie',
    title: 'B2B SaaS 商業架構師 / 前矽谷增長負責人',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    bio: '專為種子輪與 A 輪企業診斷定價分級、客戶獲取成本 (CAC) 與生命週期價值 (LTV) 槓桿。',
    skills: ['SaaS 定價', 'Unit Economics', 'PLG 增長', '客戶成功'],
    featuredCaseTitle: '協助企管軟體改制 Freemium 轉向 Seat-based',
    featuredCaseOutcome: '年經常性收入 (ARR) 於 6 個月內提升 180%。',
    solverId: 'solver-2',
  },

  // 生醫療材庫
  {
    id: 'expert-biomed-1',
    thinkTankId: 'hanlin-biomed-street',
    thinkTankName: '生醫療材庫',
    name: '李立衡 博士',
    title: '生醫創新育成產學顧問 / 科技政策研究員',
    avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80',
    bio: '協助深科技（Deep Tech）與生醫/材料團隊申請政府研發補助、臨床試驗法規沙盒與專利智財技轉。',
    skills: ['生醫產學合作', '醫療器材法規', '專利技術移轉', '科研補助計畫'],
    featuredCaseTitle: '生醫感測晶片實驗室技轉方案評估',
    featuredCaseOutcome: '成功媒合上市電子廠產學合資，取得天使期 1,500 萬技術授權款。',
    solverId: 'solver-5',
  },
  {
    id: 'expert-biomed-2',
    thinkTankId: 'hanlin-biomed-street',
    thinkTankName: '生醫療材庫',
    name: '溫心瑜 博士',
    title: '前跨國醫材廠法規事務處長 / FDA & TFDA 取證專家',
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80',
    bio: '專精智慧醫材 (SaMD)、穿戴式復健裝置之 ISO 13485 品質系統建置與台美歐醫材查驗登記。',
    skills: ['FDA 510(k) 取證', 'TFDA 查驗登記', 'ISO 13485', '智慧醫材 SaMD'],
    featuredCaseTitle: 'AI 輔助醫學影像軟體 TFDA 與 FDA 雙認證輔導',
    featuredCaseOutcome: '縮短臨床驗證補件週期 4 個月，順利取得上市許可。',
  },

  // 創意設計庫
  {
    id: 'expert-design-1',
    thinkTankId: 'hanlin-design-street',
    thinkTankName: '創意設計庫',
    name: '黃雅筑 Alice',
    title: 'D2C 品牌視覺與增長策略師 / 數位體驗設計總監',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    bio: '擅長結合品牌識別設計、UI/UX 轉換率優化與群眾募資視覺敘事，打造高共鳴產品體驗。',
    skills: ['UI/UX 產品設計', '品牌識別系統', '募資視覺敘事', 'D2C 體驗優化'],
    featuredCaseTitle: '環保生活小物單月募資突破 300 萬實戰',
    featuredCaseOutcome: '重塑產品互動體驗與包裝設計，ROI 達 4.3。',
    solverId: 'solver-4',
  },
  {
    id: 'expert-design-2',
    thinkTankId: 'hanlin-design-street',
    thinkTankName: '創意設計庫',
    name: '吳少廷 Ryan',
    title: '紅點設計獎得主 / 工業設計與軟硬體人機介面顧問',
    avatar: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=150&auto=format&fit=crop&q=80',
    bio: '12 年工業造物與智慧硬體機構設計經驗，協助新創從概念草圖、3D 打樣到開模量產（DFM）一站落地。',
    skills: ['工業產品設計', '機構與模具 DFM', '人機互動介面', '3D 原型打樣'],
    featuredCaseTitle: '商用智慧咖啡機外觀與模組化維修結構設計',
    featuredCaseOutcome: '組裝工時降低 40%，榮獲德國紅點產品設計獎。',
  },

  // 法律智財庫
  {
    id: 'expert-legal-1',
    thinkTankId: 'hanlin-legal-street',
    thinkTankName: '法律智財庫',
    name: '徐宛婷 Sonia',
    title: '早期天使投資機構投資經理 / 募資法務與股權架構師',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    bio: '審查超過 800 份創業商業計畫書，專精閉鎖性公司章程、SAFE 投資協議、技術入股與股權激勵池設計。',
    skills: ['股權架構設計', '投資條款清單', 'SAFE 轉換特別股', '募資財務合規'],
    featuredCaseTitle: '無人零售新創 Pre-A 輪 3,000 萬融資架構梳理',
    featuredCaseOutcome: '優化 Cap Table 與特別股條款，一個月內取得 2 家領投機構 Term Sheet。',
    solverId: 'solver-7',
  },
  {
    id: 'expert-legal-2',
    thinkTankId: 'hanlin-legal-street',
    thinkTankName: '法律智財庫',
    name: '蘇柏宇 律師 / 專利師',
    title: '科技法律事務所合夥律師 / 跨國專利與 AI 合規顧問',
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
    bio: '雙執照律師與專利師，專注軟體演算法專利佈局、開源授權合規、個資法與跨國商務技術授權契約。',
    skills: ['發明專利佈局', '營業秘密保護', 'AI 著作權合規', '跨國授權契約'],
    featuredCaseTitle: 'AI 醫療影像新創歐美專利防禦網佈局',
    featuredCaseOutcome: '完成 6 國核心演算法專利申請，順利通過跨國併購盡職調查 (DD)。',
  },
];

type StandSeed = Omit<IslandStand, 'parentIslandId' | 'parentDistrictId' | 'parentStreetId'>;
type StreetSeed = Omit<IslandStreet, 'stands'> & { stands: StandSeed[] };
type DistrictSeed = Omit<IslandDistrict, 'streets'> & { streets: StreetSeed[] };
type StandOptions = {
  category?: string;
  tertiaryCategory?: string;
  subcategoryKeyword?: string;
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
  contentFilter: {
    source,
    ...(options.category ? { category: options.category } : {}),
    ...(options.tertiaryCategory ? { tertiaryCategory: options.tertiaryCategory } : {}),
    ...(options.subcategoryKeyword ? { subcategoryKeyword: options.subcategoryKeyword } : {}),
  },
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
  subtitle: '依照遊戲種類分設展區，點選各展區體驗精選作品',
  streets: gameScenes.map((game) => ({
    id: `game-street-${game.category}`,
    name: `${game.category}展區`,
    subtitle: game.summary,
    stands: [
      stand(
        `game-${game.category}`,
        `${game.category}展台`,
        'game',
        game.template,
        game.palette,
        game.emoji,
        'game_table',
        game.summary,
        game.npc,
        {
          tertiaryCategory: game.category,
          navigationTarget: { tab: 'explore', specialZone: 'vibecoding' },
        },
      ),
    ],
  })),
};

export interface IslandAgentProfile {
  id: string;
  name: string;
  title: string;
  tagline?: string;
  img: string;
  idCard?: { thumb: string; full: string };
  intro: string;
  duties: string[];
  spots: string[];
  accent: string;
}

export const IDEAX_AGENTS: IslandAgentProfile[] = [
  {
    id: 'agent-xiaodengpao',
    name: '小燈泡',
    title: '調節器 Agent',
    img: '/agents/xiaodengpao.webp',
    idCard: { thumb: '/agents/idcard-xiaodengpao-thumb.webp', full: '/agents/idcard-xiaodengpao.webp' },
    intro: '天生領袖氣質，是團隊的主心骨，當燈泡亮起就是又有 idea 了！💡 也是 IdeaX 的站內嚮導。聽懂你想問什麼，再把問題轉給最適合的助理處理。',
    duties: ['站內導覽與功能說明', '聽懂需求、分派給合適的 Agent', '客服問題的第一線接待'],
    spots: ['全站右下角', '中央廣場'],
    accent: 'from-amber-100 to-yellow-50 border-amber-200',
  },
  {
    id: 'agent-sousou',
    name: '搜搜',
    title: '探索者 Agent、偵查與傳令',
    img: '/agents/sousou.webp',
    idCard: { thumb: '/agents/idcard-sousou-thumb.webp', full: '/agents/idcard-sousou.webp' },
    intro: '話不多，執行效率超高，接到任務瞬間飛到九霄雲天之外～會幫你整理求職條件，帶你前往各大求職平台搜尋最新職缺。',
    duties: ['整理正職、兼職與國外求職條件', '依條件提供各求職平台搜尋入口', '提醒你在來源網站確認職缺內容與招募狀態'],
    spots: ['匯職缺頁左下角', '求職廟'],
    accent: 'from-blue-100 to-sky-50 border-blue-200',
  },
  {
    id: 'agent-baimiao',
    name: '白喵',
    title: '市場顧問 Agent',
    img: '/agents/baimiao.webp',
    idCard: { thumb: '/agents/idcard-baimiao-thumb.webp', full: '/agents/idcard-baimiao.webp' },
    intro: '哈基米！一隻不會被好奇心害死的貓，除了到處聽八卦，就是呼呼大睡～剛被 IdeaX 聘為市場顧問，負責分析報告、找專家、獵人頭、貼標籤，偶爾還會被 call 去當和事佬。',
    duties: ['題目自動分類與貼標籤', '智慧獵頭、專家媒合', '付費深度分析報告', '交易爭議調解（和事佬）'],
    spots: ['首頁主題專區上方', '翰林院人才獵頭', '付費分析報告'],
    accent: 'from-yellow-100 to-orange-50 border-yellow-200',
  },
  {
    id: 'agent-duohui',
    name: '頂多慧（多慧）',
    title: '官方客服 Agent',
    img: '/agents/duohui.webp?v=2',
    idCard: { thumb: '/agents/idcard-duohui-thumb.webp', full: '/agents/idcard-duohui.webp' },
    intro: '精靈族的貓頭鷹，看起來聰明、喜歡與不同的人交流。IdeaX 的 25hr 官方客服（超時工作中…），有任何問題都可以來找多慧！',
    duties: ['回答站上各種問題、操作引導', '點數託管與驗收撥款說明', '交付爭議與退款政策', '會員方案與認證流程'],
    spots: ['客服視窗', '儲值與會員方案', '中央廣場公告欄'],
    accent: 'from-emerald-100 to-green-50 border-emerald-200',
  },
  {
    id: 'agent-007',
    name: '007',
    title: 'AI CRM Agent',
    tagline: '雷達・軍師・私人特助',
    img: '/agents/agent007.webp',
    idCard: { thumb: '/agents/idcard-agent007-thumb.webp', full: '/agents/idcard-agent007.webp' },
    intro: '人機族的 AI CRM Agent，集雷達、軍師、特助三件法寶於一身：可以探測客戶動態、謀定策略、管理任務。',
    duties: ['雷達：案件巡航、掃描市場與潛在機會', '軍師：客群與成案意向分析、提供策略', '特助：任務管理、建議最佳跟進時機'],
    spots: ['AI-CRM 功能頁', '小燈泡轉介'],
    accent: 'from-violet-100 to-purple-50 border-violet-200',
  },
  {
    id: 'agent-bear',
    name: '大熊（預備神兵）',
    title: '技術落地神兵 / 神秘成員',
    img: '/agents/bear.webp',
    intro: '創點源的神秘成員。個子高大、有點憨厚，擅長幫人把想法落地，懂很多技術，為創點源各項工程默默守護。',
    duties: ['複雜技術攻堅與架構落地', '硬體打樣與軟體系統實作調研', '默默守護創點源水系與山林工坊'],
    spots: ['中央廣場神木旁', '百工坊'],
    accent: 'from-stone-100 to-amber-50/50 border-stone-300',
  },
];

const rawIslands: IdeaXIsland[] = [
  createIsland('home', '主島', '中央廣場', '從這裡出發，探索 IdeaX 的內容、服務與守護 Agent 角色。', '🏛️', { x: 50, y: 50, size: 'large', land: '#d9c797', edge: '#a77c53' }, [
    { id: 'main-plaza', name: '中央廣場', subtitle: '探索看板、島覽地圖與守護 Agent 角色介紹', streets: [
      { id: 'main-latest-street', name: '探索看板', subtitle: '直接逛全站最新公開內容', stands: [stand('main-latest', '探索看板', 'all', 'central-plaza', 'plaza', ['📰', '💡', '🧭'], 'cards', '沿著中央廣場的公告欄瀏覽 IdeaX 目前最新公開內容與探索動態。', npc('多慧', '創點源導覽員', '想先看看大家最近提出的問題、討論和作品嗎？', 'home', '看全站內容'), { navigationTarget: { tab: 'explore' } })] },
      { id: 'main-quick-street', name: '島覽地圖', subtitle: '新手導覽教學、平台介紹、運作說明、條款聲明', stands: [] },
      { id: 'main-agents-street', name: '角色介紹', subtitle: '創點源六隻守護 Agent 介紹與身分證名冊', stands: [stand('main-agents-roster', '六大 Agent 角色介紹', 'all', 'guide-center', 'plaza', ['🤖', '💡', '🪪'], 'cards', '創點源六大原創 Agent 角色：小燈泡、搜搜、白喵、頂多慧、007、大熊！查看角色職位、出沒地點與虛擬身分證。', npc('小燈泡', '調節器 Agent', '哈囉！我們是創點源的六位守護夥伴，點擊卡片就能查看大家的檔案與身分證喔！💡', 'home', '查看角色介紹'))] },
    ] },
    { id: 'main-trade', name: '貿易街(開發中)', subtitle: '商案商品交易與專案競標市集（開發中，暫未開放）', streets: [
      { id: 'main-trade-street', name: '貿易街(開發中)', subtitle: '專案交易與競標市集（開發中）', stands: [stand('main-trade-market', '貿易街(開發中)', 'all', 'guide-center', 'plaza', ['🪙', '⚖️', '📦'], 'cards', '貿易街專案商品交易與專案競標市集籌備中，暫未開放。', npc('貿易掌事', '貿易街掌事', '貿易街目前正在籌備建設中，標示暫未開放，敬請期待後續功能！', 'home', '暫未開放'), { interactionPrompt: '貿易街目前籌備中，暫未對外開放。' })] },
    ] },
  ]),
  createIsland('creative', '創意島', '創意島', '展覽館與電玩城，發現軟體作品、遊戲和提案。', '💡', { x: 8, y: 92, size: 'large', land: '#b8cf9b', edge: '#6f9666' }, [
    { id: 'creative-exhibition', name: '薈萃樓', subtitle: '展覽館・作品、AI 工具與創新提案主題展館（二級展場 ➔ 三級個案攤位）', streets: [
      {
        id: 'creative-ai-booth',
        name: 'AI 工具展場',
        subtitle: '在展覽館展示 AI 工具、智能助手與大模型應用作品展場。',
        stands: [
          stand('creative-ai-tools', '全部 AI 工具攤位', 'app', 'future-lab', 'gallery', ['🤖', '🧪', '✨'], 'exhibits', '瀏覽 AI 工具展場所有細分類之個別個案攤位。', npc('小艾', 'AI 工具展場主理人', '想找 AI 工具或看看創作者的新作品嗎？以下每個個案都是一個獨立攤位。', 'vibecoding_feed', '前往 AI 工具展場'), { subcategoryKeyword: 'AI|人工智慧|智慧|生成|模型|Agent|Prompt|自動|語音|視覺|機器學習', navigationTarget: { tab: 'explore', specialZone: 'vibecoding' } }),
          stand('creative-ai-genai', '生成式 AI 與對話助教攤位', 'app', 'future-lab', 'gallery', ['💬', '🧠', '🤖'], 'exhibits', '文字生成、對話助教、知識檢索與智慧問答類個案攤位。', npc('小艾', 'AI 工具展場主理人', '這處展場收錄生成式 AI、知識庫與智慧助教相關個案攤位。', 'vibecoding_feed', '查看生成式 AI 攤位'), { subcategoryKeyword: '生成|對話|助教|客服|問答|Agent|文字|翻譯|知識|聊天|提示詞', navigationTarget: { tab: 'explore', specialZone: 'vibecoding' } }),
          stand('creative-ai-efficiency', '智慧自動化與效率分析攤位', 'app', 'future-lab', 'gallery', ['⚡', '📊', '⚙️'], 'exhibits', '工作流自動化、數據分析、排程管理與生產力 AI 個案攤位。', npc('小艾', 'AI 工具展場主理人', '這處展場收錄自動化工作流與數據分析 AI 個案攤位。', 'vibecoding_feed', '查看效率分析 AI 攤位'), { subcategoryKeyword: '自動|效率|分析|數據|報表|管理|排程|財務|筆記|摘要|辦公', navigationTarget: { tab: 'explore', specialZone: 'vibecoding' } }),
          stand('creative-ai-media', '影像視覺與多媒體創作攤位', 'app', 'future-lab', 'gallery', ['🎨', '🎬', '🎵'], 'exhibits', 'AI 繪圖、影音生成、設計輔助與多媒體創作類個案攤位。', npc('小艾', 'AI 工具展場主理人', '這處展場展示影像、音樂與多媒體創作 AI 個案攤位。', 'vibecoding_feed', '查看多媒體 AI 攤位'), { subcategoryKeyword: '影像|視覺|繪圖|設計|音樂|語音|影片|創作|媒體|照片|3D', navigationTarget: { tab: 'explore', specialZone: 'vibecoding' } }),
        ],
      },
      {
        id: 'creative-software-booth',
        name: '軟體應用展場',
        subtitle: '以展場展品呈現已發布的軟體網站作品。',
        stands: [
          stand('creative-software', '全部軟體應用攤位', 'app', 'software-gallery', 'gallery', ['🖥️', '🧰', '🌐'], 'exhibits', '瀏覽軟體應用展場所有細分類之個別個案攤位。', npc('程程', '軟體應用展場主理人', '點選下方任何個案攤位即可查看 IdeaX 上的軟體網站作品介紹。', 'vibecoding_feed', '前往軟體應用展場'), { navigationTarget: { tab: 'explore', specialZone: 'vibecoding' } }),
          stand('creative-software-web', '網站平台與互動服務攤位', 'app', 'software-gallery', 'gallery', ['🌐', '🧭', '💻'], 'exhibits', '互動網站、社群平台、地圖導覽與線上服務類個案攤位。', npc('程程', '軟體應用展場主理人', '這處展場聚集了互動網站、平台與線上服務個案攤位。', 'vibecoding_feed', '查看網站平台攤位'), { subcategoryKeyword: '網站|平台|社群|地圖|導覽|互動|門戶|論壇|媒合|協作', navigationTarget: { tab: 'explore', specialZone: 'vibecoding' } }),
          stand('creative-software-life', '生活實用與學習生產力攤位', 'app', 'software-gallery', 'gallery', ['📝', '📚', '🌱'], 'exhibits', '日常生活工具、教育學習、習慣養成與個人效率類個案攤位。', npc('程程', '軟體應用展場主理人', '這處展場展示日常生活與學習生產力相關的軟體個案攤位。', 'vibecoding_feed', '查看生活實用攤位'), { subcategoryKeyword: '生活|學習|教育|工具|效率|筆記|健康|飲食|旅遊|記帳|日常', navigationTarget: { tab: 'explore', specialZone: 'vibecoding' } }),
          stand('creative-software-biz', '商業營運與數位系統攤位', 'app', 'software-gallery', 'gallery', ['📈', '🏢', '🛠️'], 'exhibits', '商業管理、電商零售、預約排班與企業數位化系統個案攤位。', npc('程程', '軟體應用展場主理人', '這處展場展示商業營運與數位管理系統的軟體個案攤位。', 'vibecoding_feed', '查看商業系統攤位'), { subcategoryKeyword: '商業|管理|企業|營運|電商|預約|POS|CRM|系統|B2B|行銷|財務', navigationTarget: { tab: 'explore', specialZone: 'vibecoding' } }),
        ],
      },
      {
        id: 'creative-proposal-booth',
        name: '創新提案展場',
        subtitle: '查看 IdeaX 使用者公開的創新提案與合作構想展場。',
        stands: [
          stand('creative-proposals', '全部創新提案攤位', 'proposal', 'proposal-gallery', 'gallery', ['📋', '💡', '🤝'], 'exhibits', '瀏覽創新提案展場所有細分類之個別個案攤位。', npc('提提', '創新提案展場策展人', '一起看看正在發展中的創新點子，每個提案個案皆為一個獨立攤位。', 'ideas_feed', '前往創新提案展場'), { navigationTarget: { tab: 'explore', specialZone: 'create_ideas' } }),
          stand('creative-proposals-tech', '資訊科技與智慧應用提案攤位', 'proposal', 'proposal-gallery', 'gallery', ['💻', '🤖', '🚀'], 'exhibits', 'AI 應用、軟硬體整合、物聯網與前瞻科技創新提案攤位。', npc('提提', '創新提案展場策展人', '這處展場展示資訊科技與智慧工程相關的創新提案攤位。', 'ideas_feed', '查看科技提案攤位'), { subcategoryKeyword: '資訊|科技|AI|軟體|系統|物聯網|晶片|機械|工業|自動|硬體', navigationTarget: { tab: 'explore', specialZone: 'create_ideas' } }),
          stand('creative-proposals-biz', '商業模式與跨域服務提案攤位', 'proposal', 'proposal-gallery', 'gallery', ['📈', '🏪', '🤝'], 'exhibits', '新型態商業模式、零售餐飲、O2O 與跨域合作提案攤位。', npc('提提', '創新提案展場策展人', '這處展場展示商業經營、服務創新與跨界合作的提案攤位。', 'ideas_feed', '查看商業提案攤位'), { subcategoryKeyword: '商業|經營|服務|餐飲|零售|共享|行銷|金融|企業|電商|創業', navigationTarget: { tab: 'explore', specialZone: 'create_ideas' } }),
          stand('creative-proposals-life', '日常生活與文創永續提案攤位', 'proposal', 'proposal-gallery', 'gallery', ['🎨', '🏡', '🌿'], 'exhibits', '生活改善、文創工藝、永續環保與社會創新提案攤位。', npc('提提', '創新提案展場策展人', '這處展場展示日常生活、文創設計與永續環保提案攤位。', 'ideas_feed', '查看生活文創攤位'), { subcategoryKeyword: '日常|生活|文創|設計|工藝|教育|環保|綠能|寵物|社區|農業', navigationTarget: { tab: 'explore', specialZone: 'create_ideas' } }),
          stand('creative-proposals-biomed', '生醫療材與前瞻研究提案攤位', 'proposal', 'proposal-gallery', 'gallery', ['🧬', '🏥', '🔬'], 'exhibits', '生技醫療、健康照護、醫材研發與學術應用提案攤位。', npc('提提', '創新提案展場策展人', '這處展場展示生醫療材、健康照護與學術應用提案攤位。', 'ideas_feed', '查看生醫提案攤位'), { subcategoryKeyword: '生醫|醫療|健康|照護|生技|藥|復健|學術|研究|臨床', navigationTarget: { tab: 'explore', specialZone: 'create_ideas' } }),
        ],
      },
    ] },
    gamesDistrict,
  ]),
  createIsland('pain', '痛點島', '創點樓', '走進創點樓，於懸賞牆分門別類查看痛點，或於佈告桌撰寫並刊登痛點。', '🔥', { x: 8, y: 8, size: 'large', land: '#dfb98c', edge: '#b37b57' }, [
    { id: 'pain-innovation-tower', name: '創點樓', subtitle: '樓內設有懸賞牆（分門別類瀏覽與刊登）與佈告桌（撰寫痛點表單並刊登）', streets: [
      { id: 'pain-bounty-wall-street', name: '懸賞牆', subtitle: '分門別類瀏覽各領域痛點，亦可刊登痛點', stands: [stand('pain-bounty-wall', '懸賞牆', 'pain', 'innovation-tower', 'problem', ['🧾', '📌', '🔥'], 'scrolls', '分門別類收錄各領域真實痛點與懸賞，並可直接刊登痛點。', npc('掌櫃阿點', '創點樓掌櫃', '客官，懸賞牆上已按類別分門別類張貼各方痛點；若您也有痛點難題，隨時可刊登於牆上！', 'create_pain_point', '刊登痛點'), { sceneMood: '創點樓懸賞牆', navigationTarget: { tab: 'explore', specialZone: 'pain_points' }, interactionPrompt: '依分類檢視懸賞牆上的痛點需求，或點擊下方按鈕刊登您的痛點。' })] },
      { id: 'pain-posting-desk-street', name: '佈告桌', subtitle: '撰寫痛點（填寫表單）並刊登至懸賞牆', stands: [stand('pain-posting-desk', '佈告桌', 'pain', 'needs-board', 'problem', ['🖋️', '📜', '🪵'], 'scrolls', '在佈告桌前填寫痛點表單，撰寫完畢即可直接刊登至懸賞牆。', npc('掌櫃阿點', '創點樓掌櫃', '客官請於佈告桌前坐下，填妥痛點表單後即可直接刊登張貼至懸賞牆！', 'create_pain_point', '撰寫並刊登痛點'), { sceneMood: '創點樓佈告桌', navigationTarget: { tab: 'explore', specialZone: 'pain_points' }, interactionPrompt: '請於佈告桌填寫痛點標題、分類與詳細描述並刊登。' })] },
    ] },
  ]),
  createIsland('discussion', '討論島', '討論島', '由茶藝街、百工坊、藏書閣三個分明街區構成：走進茶藝街品茗論道、入百工坊各店鋪切磋技術，或登藏書閣（含地下分類圖書館）研讀經典。', '💬', { x: 92, y: 8, size: 'large', land: '#e2cc99', edge: '#b59161' }, [
    { id: 'discussion-daily-district', name: '茶藝街', subtitle: '江南茶藝長街，街道兩側茶莊、茶樓、茶寮與露天茶座林立，每張討論卡片為一茶桌', streets: [
      { id: 'discussion-daily-street', name: '主題茶館', subtitle: '依主題劃分茶館，入座茶桌品茗暢聊', stands: [
        stand('discussion-daily', '日常交流茶館', 'discussion', 'discussion-market', 'market', ['🍵', '🫖', '💬'], 'cards', '日常茶館，每個討論卡片即為一張品茗茶桌。', npc('陸羽', '茶藝街掌櫃', '客官請上座！先飲盞西湖龍井。此處每個主題皆為一茶館，每張卡片皆是一張茶桌，請挑一桌坐下慢聊。', 'discussion_feed', '入座茶桌品茗'), { category: '日常疑難', navigationTarget: { tab: 'explore', specialZone: 'l0_discussion' } }),
        stand('discussion-life-tea', '生活慢調茶館', 'discussion', 'discussion-market', 'market', ['🌱', '☕', '💡'], 'cards', '生活閒情、身心療癒與日常隨筆交流茶桌。', npc('茶娘', '慢調茶館掌櫃', '生活瑣事亦有真味。請挑張茶桌，與茶友聊聊日常。', 'discussion_feed', '進入生活茶館'), { subcategoryKeyword: '生活|日常|情感|心靈|健康|旅行|美食|休閒', navigationTarget: { tab: 'explore', specialZone: 'l0_discussion' } }),
        stand('discussion-work-tea', '職場江湖茶館', 'discussion', 'discussion-market', 'market', ['💼', '🍵', '🤝'], 'cards', '職場切磋、職涯心得與商道人脈交流茶桌。', npc('老周', '職場茶館茶客', '職場冷暖，飲茶自明。選張茶桌入座，聽聽大家的江湖故事。', 'discussion_feed', '進入職場茶館'), { subcategoryKeyword: '職場|工作|職涯|求職|轉職|管理|同事|人脈', navigationTarget: { tab: 'explore', specialZone: 'l0_discussion' } }),
        stand('discussion-idea-tea', '靈感悟道茶館', 'discussion', 'discussion-market', 'market', ['✨', '💭', '📜'], 'cards', '靈感迸發、哲思悟道與前瞻話題交流茶桌。', npc('清風', '靈感茶師', '奇思如沸水浮香。挑張靈感茶桌，與天下道友品茗暢談。', 'discussion_feed', '進入靈感茶館'), { subcategoryKeyword: '靈感|哲學|思維|創意|想法|分享|交流|探討', navigationTarget: { tab: 'explore', specialZone: 'l0_discussion' } }),
      ] },
    ] },
    { id: 'discussion-tech-district', name: '百工坊', subtitle: '依分類設有水電坊、室內裝修坊、法律智財坊、會計稅務坊、企業管理坊，街道旁兩排佈告欄張貼各種討論，各店鋪輪播展示熱門討論', streets: [
      { id: 'tech-plumbing-workshop', name: '水電坊', subtitle: '水電工程、管線配置、電力檢修與居家修繕討論，店鋪看板輪播熱門水電討論', stands: [stand('tech-workshop-plumbing', '水電坊', 'discussion', 'maker-market', 'market', ['🔧', '💧', '⚡'], 'cards', '百工坊・水電坊，探討水電配線、給排水工程與修繕實務，店門輪播熱門討論，街道兩排佈告欄張貼最新話題。', npc('阿水師', '水電坊掌櫃', '歡迎來到水電坊！門口看板正輪播本坊最熱門的水電討論，街道兩旁佈告欄也貼滿了大家的交流喔！', 'discussion_feed', '進入水電坊'), { subcategoryKeyword: '水電|管線|配線|漏水|跳電|插座|衛浴|馬達|水塔|電工|修繕', category: '專業問題', navigationTarget: { tab: 'explore', specialZone: 'l0_discussion' } })] },
      { id: 'tech-interior-workshop', name: '室內裝修坊', subtitle: '空間規劃、木作泥作、裝潢材質與施工實務討論，店鋪看板輪播熱門裝修討論', stands: [stand('tech-workshop-interior', '室內裝修坊', 'discussion', 'maker-market', 'market', ['🏠', '🪚', '🎨'], 'cards', '百工坊・室內裝修坊，探討室內設計、木工泥作與建材工法，店門輪播熱門討論，街道兩排佈告欄張貼最新話題。', npc('魯班師', '室內裝修坊掌櫃', '歡迎來到室內裝修坊！店鋪上方正輪播熱門裝修話題，街道兩排佈告欄也能查看各式裝潢討論。', 'discussion_feed', '進入室內裝修坊'), { subcategoryKeyword: '室內裝修|裝修|裝潢|木工|油漆|泥作|系統櫃|設計|地板|隔音|採光|建材', category: '專業問題', navigationTarget: { tab: 'explore', specialZone: 'l0_discussion' } })] },
      { id: 'tech-law-workshop', name: '法律智財坊', subtitle: '契約規範、專利商標、著作權與法務實務討論，店鋪看板輪播熱門法務討論', stands: [stand('tech-workshop-law', '法律智財坊', 'discussion', 'maker-market', 'market', ['⚖️', '📜', '🛡️'], 'cards', '百工坊・法律智財坊，探討法律諮詢、合約審閱與智慧財產權保護，店門輪播熱門討論，街道兩排佈告欄張貼最新話題。', npc('包掌事', '法律智財坊掌櫃', '歡迎來到法律智財坊！無論是專利商標或契約實務，都可在店鋪輪播與街旁兩排佈告欄翻閱熱議話題。', 'discussion_feed', '進入法律智財坊'), { subcategoryKeyword: '法律智財|法律|智財|專利|商標|著作權|合約|訴訟|法務|條款|糾紛|權益', category: '專業問題', navigationTarget: { tab: 'explore', specialZone: 'l0_discussion' } })] },
      { id: 'tech-tax-workshop', name: '會計稅務坊', subtitle: '記帳報稅、稅務規劃、公司財務與審計實務討論，店鋪看板輪播熱門財稅討論', stands: [stand('tech-workshop-tax', '會計稅務坊', 'discussion', 'maker-market', 'market', ['🧮', '📊', '💰'], 'cards', '百工坊・會計稅務坊，探討企業報稅、帳務處理與財務節稅實務，店門輪播熱門討論，街道兩排佈告欄張貼最新話題。', npc('算盤叔', '會計稅務坊掌櫃', '歡迎來到會計稅務坊！最新與最熱門的財稅討論都在店門輪播與街旁兩排佈告欄上！', 'discussion_feed', '進入會計稅務坊'), { subcategoryKeyword: '會計稅務|會計|稅務|報稅|發票|營業稅|營所稅|記帳|財務|節稅|審計|帳務', category: '專業問題', navigationTarget: { tab: 'explore', specialZone: 'l0_discussion' } })] },
      { id: 'tech-mgmt-workshop', name: '企業管理坊', subtitle: '組織管理、營運策略、人資制度與流程優化討論，店鋪看板輪播熱門企管討論', stands: [stand('tech-workshop-mgmt', '企業管理坊', 'discussion', 'maker-market', 'market', ['🏢', '📈', '🤝'], 'cards', '百工坊・企業管理坊，探討企業經營、團隊管理與制度轉型，店門輪播熱門討論，街道兩排佈告欄張貼最新話題。', npc('管仲師', '企業管理坊掌櫃', '歡迎來到企業管理坊！店門走馬燈正輪播熱門企管討論，也歡迎沿街瀏覽兩排佈告欄上的百業話題。', 'discussion_feed', '進入企業管理坊'), { subcategoryKeyword: '企業管理|管理|組織|人資|KPI|OKR|營運|策略|領導|流程|企業|制度', category: '專業問題', navigationTarget: { tab: 'explore', specialZone: 'l0_discussion' } })] },
    ] },
    { id: 'discussion-academic-district', name: '藏書閣', subtitle: '古雅藏書閣與地下多書架分類圖書館，每層樓一類，每個卡片為獨立書架典籍與研討室', streets: [
      { id: 'discussion-academic-floor-1', name: '一層·資訊工程閣', subtitle: '演算法、系統架構與人工智慧學術典籍書架', stands: [stand('lib-floor-1', '資訊工程研討室', 'discussion', 'knowledge-library', 'market', ['💻', '🧠', '📜'], 'cards', '一層書庫與地下圖書館資訊工程書架區，收納資訊科學與前瞻計算經典。', npc('知知', '一層典籍官', '閣下一層請！此樓與地下書庫典藏前瞻演算法與計算架構，各書架與研討室正展開深度思辨。', 'discussion_feed', '進入一層書庫'), { subcategoryKeyword: '資訊|工程|技術|演算法|AI|架構|計算|代碼', category: '專業問題', navigationTarget: { tab: 'explore', specialZone: 'l0_discussion' } })] },
      { id: 'discussion-academic-floor-2', name: '二層·經世商道閣', subtitle: '經濟模型、商業經營與產業分析典籍書架', stands: [stand('lib-floor-2', '經世商道研討室', 'discussion', 'knowledge-library', 'market', ['📈', '💼', '📑'], 'cards', '二層書庫與地下圖書館經世商道書架區，研讀市場規律、商業經濟與組織戰略。', npc('閱文', '二層典籍官', '二層匯聚經世濟民之論，請入各書架廊道與研討室切磋商道。', 'discussion_feed', '進入二層書庫'), { subcategoryKeyword: '商業|經濟|管理|金融|行銷|市場|策略|經營', category: '商業職場', navigationTarget: { tab: 'explore', specialZone: 'l0_discussion' } })] },
      { id: 'discussion-academic-floor-3', name: '三層·自然生命閣', subtitle: '生醫科學、自然物理與前瞻材料典籍書架', stands: [stand('lib-floor-3', '自然生命研討室', 'discussion', 'knowledge-library', 'market', ['🧬', '🔬', '🌿'], 'cards', '三層書庫與地下圖書館自然生命書架區，探討生命科學、物性機理與醫學前沿。', npc('博雅', '三層典籍官', '三層探求造化之理，歡迎入室翻閱書架典籍、研討自然科學前沿。', 'discussion_feed', '進入三層書庫'), { subcategoryKeyword: '生醫|醫學|自然|物理|化學|生命|科學|材料', category: '專業問題', navigationTarget: { tab: 'explore', specialZone: 'l0_discussion' } })] },
      { id: 'discussion-academic-floor-4', name: '四層·人文哲思閣', subtitle: '哲學思辨、文史藝術與社科理論典籍書架', stands: [stand('lib-floor-4', '人文哲思研討室', 'discussion', 'knowledge-library', 'market', ['📚', '🎨', '✨'], 'cards', '四層書庫與地下圖書館人文哲思書架區，深研哲學美學與人文社會。', npc('清微', '四層典籍官', '登高望遠，四層專研人文思想與社會心智，請入書架長廊與研討室深思。', 'discussion_feed', '進入四層書庫'), { subcategoryKeyword: '人文|哲學|藝術|文化|歷史|社會|心理|思維', category: '學術探討', navigationTarget: { tab: 'explore', specialZone: 'l0_discussion' } })] },
    ] },
  ]),
  createIsland('career', '徵才島', '徵才島', '進求職廟求籤（填需求匯職缺）、委託人才獵頭/媒合專家，或入翰林院查閱五大專家智庫。', '🧧', { x: 92, y: 92, size: 'large', land: '#d6a68d', edge: '#a86d57' }, [
    { id: 'career-temple-district', name: '求職廟', subtitle: '求籤祈願：填需求 · 匯職缺', streets: [
      { id: 'career-temple-street', name: '求職廟', subtitle: '填寫求職條件，比對全網匯職缺', stands: [stand('career-temple-main', '求職廟靈籤祈願', 'jobs', 'career-temple', 'temple', ['🧧', '🪭', '📜'], 'job_board', '填寫求職條件，由搜搜為你整理並在全網匯職缺搜尋最新機會。', npc('搜搜', '探索者 Agent', '填寫求職條件，我幫你比對全網匯職缺！', 'jobs', '填寫求職條件'), { contentKind: 'jobs', navigationTarget: { tab: 'job_explorer' }, interactionPrompt: '填寫求職條件，在匯職缺比對最新工作。', audioProfile: 'quiet-temple' })] },
    ] },
    { id: 'career-headhunter-district', name: '人才獵頭/媒合專家', subtitle: '高階人才獵頭尋訪與跨域專家媒合委託', streets: [
      { id: 'hanlin-headhunter-street', name: '人才獵頭/媒合專家', subtitle: '高階人才獵頭與跨域專家媒合', stands: [stand('hanlin-headhunter', '人才獵頭/媒合專家', 'experts', 'expert-guild', 'temple', ['🤝', '🎯', '🧭'], 'guild_roster', '高階人才獵頭與跨領域專家媒合服務，配屬白喵顧問 Agent，提供企業獵才與專家對接。', npc('白喵', '市場顧問 Agent', '哈基米！找關鍵人才或跨領域專家，交給我！', 'experts', '委託獵頭媒合'), { contentKind: 'experts', navigationTarget: { tab: 'solvers' } })] },
    ] },
    { id: 'career-hanlin-district', name: '翰林院', subtitle: '五大領域專家智庫，分藏各領域名冊', streets: [
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
      case 'app': return (question.postType === 'vibecoding_app' || question.specialZone === 'vibecoding') && !isGameQuestion(question);
      case 'proposal': return question.postType === 'innovation_proposal' || question.specialZone === 'create_ideas';
      case 'game': return (question.postType === 'vibecoding_app' || question.specialZone === 'vibecoding') && isGameQuestion(question);
      case 'jobs':
      case 'experts': return false;
      default: return false;
    }
  })();
  if (!sourceMatches) return false;
  if (filter.category && question.category !== filter.category && question.subcategory !== filter.category) return false;
  if (filter.tertiaryCategory && getEffectiveTertiaryCategory(question) !== filter.tertiaryCategory) return false;
  if (filter.subcategoryKeyword) {
    const keywords = filter.subcategoryKeyword.split('|').map((k) => k.trim().toLowerCase()).filter(Boolean);
    const haystack = [
      question.title,
      question.appName,
      question.description,
      question.category,
      question.subcategory,
      question.tertiaryCategory,
      ...(question.tags || []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    if (keywords.length > 0 && !keywords.some((kw) => haystack.includes(kw))) {
      return false;
    }
  }
  return question.status !== 'delisted';
}


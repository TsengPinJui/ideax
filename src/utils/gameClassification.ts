import { Question, SOFTWARE_TERTIARY_CATEGORIES } from '../types';

export const GAME_TERTIARY_CATEGORIES = [
  '休閒派對',
  '模擬體驗',
  '策略益智',
  '多人冒險',
  '競技對戰',
  '卡牌桌遊',
  '恐怖驚悚',
  '解謎劇情',
  '親子兒童',
  '甜蜜浪漫',
] as const;

export type GameTertiaryCategory = (typeof GAME_TERTIARY_CATEGORIES)[number];

interface GameRule {
  category: GameTertiaryCategory;
  primaryKeywords: string[];
  secondaryKeywords: string[];
}

export const GAME_RULES: GameRule[] = [
  {
    category: '親子兒童',
    primaryKeywords: [
      '親子兒童',
      '親子',
      '兒童',
      '幼兒',
      '小孩',
      '寶寶',
      '童話',
      '早教',
      '啟蒙',
      '塗鴉本',
      '兒歌',
      '識字',
      '卡通',
      '小動物',
      '可愛小動物',
      '幼童',
      '小學生',
      'kids',
      'children',
      'baby',
      'toddler',
      'family',
      'preschool',
      'kindergarten',
    ],
    secondaryKeywords: [
      '可愛',
      '簡單',
      '陪伴',
      '家庭',
      '趣味學習',
      '童年',
      '寓教於樂',
      '拼字',
      '認字',
      '安全',
    ],
  },
  {
    category: '甜蜜浪漫',
    primaryKeywords: [
      '甜蜜浪漫',
      '甜蜜',
      '浪漫',
      '戀愛',
      '約會',
      '乙女',
      '情侶',
      '心動',
      '告白',
      '粉紅',
      '結婚',
      '愛心',
      '校園戀愛',
      '脫單',
      '戀與',
      '戀愛養成',
      '戀愛冒險',
      '你還記得嗎',
      '情侶互動',
      '雙人默契',
      '情侶送禮',
      '送禮大作戰',
      'love',
      'romance',
      'dating',
      'sweet',
      'couple',
      'otome',
      'heart',
    ],
    secondaryKeywords: [
      '男友',
      '女友',
      '談戀愛',
      '放閃',
      '曖昧',
      '牽手',
      '七夕',
      '情人節',
      '告白氣球',
      '情書',
      '甜蜜互動',
    ],
  },
  {
    category: '解謎劇情',
    primaryKeywords: [
      '解謎劇情',
      '劇情',
      '解謎',
      '故事',
      '偵探',
      '推理',
      '密室',
      '線索',
      '案件',
      '真相',
      '探案',
      '視覺小說',
      '互動小說',
      '文字冒險',
      '奇案',
      '證物',
      '嫌疑人',
      '伏筆',
      '懸疑',
      '謎團',
      '調查',
      '劇本',
      '破案',
      '永樂座',
      '時光迴廊',
      '雙人偵探',
      'chrono',
      'detective',
      'theater',
      '密室解謎',
      'mystery',
      'puzzle story',
      'story',
      'visual novel',
      'escape room',
    ],
    secondaryKeywords: [
      '劇情向',
      '情節',
      '分支',
      '對話',
      '日記',
      '證詞',
      '解密',
      '結局',
      '多結局',
      '文字',
      '探索',
      '小說',
      '秘密',
      '隱藏',
      'clue',
      'investigation',
    ],
  },
  {
    category: '恐怖驚悚',
    primaryKeywords: [
      '恐怖',
      '驚悚',
      '鬼',
      '殭屍',
      '喪屍',
      '幽靈',
      '嚇人',
      '密室逃脫',
      '詭異',
      '靈異',
      '噩夢',
      '惡夢',
      '殺手',
      '血腥',
      '詛咒',
      '凶宅',
      '封印',
      '異形',
      '屠殺',
      '亡靈',
      '紙厝',
      '觀落陰',
      '本棟無異常',
      'zhicuo',
      'luoyin',
      'yeban',
      '邪祟',
      'horror',
      'scary',
      'spooky',
      'thriller',
      'ghost',
      'zombie',
      'fnaf',
      'backrooms',
    ],
    secondaryKeywords: [
      '逃生',
      '怪物',
      '黑暗',
      '驚嚇',
      '逃脫',
      '死亡',
      '尖叫',
      '迷霧',
      '陰暗',
      '暗黑',
      'escape',
      'dark',
      'nightmare',
      'creepy',
    ],
  },
  {
    category: '卡牌桌遊',
    primaryKeywords: [
      '卡牌',
      '桌遊',
      '抽卡',
      '撲克',
      '麻將',
      '21點',
      '德州撲克',
      '狼人殺',
      '心理戰',
      '劇本殺',
      '大富翁',
      '棋盤',
      '戰棋',
      '卡組',
      '牌組',
      '集換式',
      '爐石',
      '塔羅',
      '骰子',
      '象棋',
      '心靈同步',
      '花火',
      'hanabi',
      'the mind',
      '數字牌',
      '出牌',
      '圍棋',
      '五子棋',
      '黑白棋',
      '飛行棋',
      '跳棋',
      '心智戰',
      'card',
      'board game',
      'deck',
      'poker',
      'mahjong',
      'blackjack',
      'dice',
      'solitaire',
      'uno',
      'tarot',
      'chess',
    ],
    secondaryKeywords: [
      '牌',
      '輪盤',
      '下棋',
      '投擲',
      '抽牌',
      '出牌',
      '牌局',
      '卡包',
      '對弈',
    ],
  },
  {
    category: '競技對戰',
    primaryKeywords: [
      '競技',
      '對戰',
      '對決',
      'pvp',
      'arena',
      '擂台',
      '坦克',
      '裝甲',
      '賽車',
      '競速',
      '格鬥',
      '拳擊',
      '足球',
      '籃球',
      '網球',
      '羽球',
      '棒球',
      '桌球',
      '吃雞',
      '大逃殺',
      '1v1',
      'pk',
      '連線對抗',
      '彈幕射擊',
      '戰機',
      '戰艦',
      '空戰',
      '海戰',
      '狙擊',
      '射箭',
      '保齡球',
      '賽馬',
      '漂移',
      'battle',
      'tank',
      'racing',
      'brawl',
      'duel',
      'shooter',
      'air combat',
      'gunfight',
      'tanks',
    ],
    secondaryKeywords: [
      '戰鬥',
      '射擊',
      '槍戰',
      '運動',
      '比賽',
      '競賽',
      '比拼',
      '爭霸',
      '對抗',
      '格鬥技',
      '打靶',
      '速度',
      'fight',
      'combat',
      'race',
    ],
  },
  {
    category: '模擬體驗',
    primaryKeywords: [
      '模擬體驗',
      '模擬',
      '料理模擬',
      '美容模擬',
      '人生模擬',
      '經營模擬',
      '洗澡',
      '美容',
      '做章魚燒',
      '章魚燒',
      '蛋包飯',
      '螺旋薯塔',
      '薯塔',
      '削蘋果',
      '拉麵',
      '漢堡',
      '冰淇淋',
      '土耳其冰淇淋',
      '狗狗洗澡',
      '貓咪照顧',
      '寵物照顧',
      '農場',
      '餐廳',
      '料理',
      '烹飪',
      '做菜',
      '烘焙',
      '煎蛋',
      '煮麵',
      '烤肉',
      '水族館',
      '城市建造',
      '打造城市',
      '城市',
      '彩虹城市',
      '生活模擬',
      '職業體驗',
      '飛行駕駛',
      '駕駛',
      '列車',
      '工廠',
      '裝修',
      '夜市廚房',
      '繞境護駕',
      '雙人機長',
      '大甲媽',
      '千里眼',
      '順風耳',
      'kitchen',
      'raojing',
      '物理模擬',
      'sim',
      'simulator',
      'tycoon',
      'cooking',
      'craft',
      'dog wash',
      'takoyaki',
      'omurice',
      'rainbow city',
    ],
    secondaryKeywords: [
      '體驗',
      '經營',
      '養成',
      '建造',
      '寵物',
      '照顧',
      '醫院',
      '開店',
      '製作',
      '生活',
      '職業',
      '治愈',
      '療癒',
      '採礦',
      '挖掘',
      '收穫',
      '80億分之1',
      'build',
      'farm',
    ],
  },
  {
    category: '策略益智',
    primaryKeywords: [
      '策略益智',
      '策略',
      '益智',
      '解謎',
      '推箱子',
      '數獨',
      '填字',
      '成語',
      '迷宮',
      '腦力',
      '燒腦',
      '邏輯',
      '推理',
      '算術',
      '數學',
      '2048',
      '連連看',
      '俄羅斯方塊',
      '消除',
      '三消',
      '塔防',
      'etf',
      'etf投資',
      '投資人生局',
      '投資',
      '理財',
      '現金流',
      '股票',
      '拆彈搭檔',
      '拆炸彈',
      '拆彈',
      'bomb',
      'puzzle',
      'logic',
      'strategy',
      'riddle',
      'tower defense',
      'tetris',
      'match 3',
      'sudoku',
      'maze',
      'brain',
      'finance',
    ],
    secondaryKeywords: [
      '拼圖',
      '思考',
      '猜謎',
      '記憶',
      '尋寶',
      '找碴',
      '佈局',
      '攻城',
      '機關',
      '幾何',
      '密碼',
      '過關',
      '算數',
    ],
  },
  {
    category: '多人冒險',
    primaryKeywords: [
      '多人冒險',
      '冒險',
      '地下城',
      '地牢',
      '探索',
      '勇者',
      '打怪',
      '升級',
      '裝備',
      '技能',
      '副本',
      '聯機',
      '組隊',
      '倖存者',
      '橫向卷軸',
      '探險',
      '闖關',
      '平台跳躍',
      '奇幻',
      '魔法',
      '英雄',
      '拯救',
      '迷宮探險',
      '角色扮演',
      'rpg',
      '修仙',
      '魔王',
      '史萊姆',
      '雙人神偷',
      '星際任務',
      'heist',
      'crew',
      '金庫',
      'adventure',
      'dungeon',
      'co-op',
      'multiplayer',
      'quest',
      'survivor',
      'hero',
      'knight',
    ],
    secondaryKeywords: [
      '多人',
      '跳躍',
      '障礙',
      '地底',
      '寶箱',
      '秘境',
      '旅程',
      '主線',
      '戰士',
      '法師',
    ],
  },
  {
    category: '休閒派對',
    primaryKeywords: [
      '休閒派對',
      '休閒',
      '派對',
      '點擊',
      '放置',
      '解壓',
      '趣味',
      '小品',
      '搞笑',
      '惡搞',
      '彈珠',
      '抓娃娃',
      '夾娃娃',
      '音遊',
      '節奏',
      '聚會',
      '破冰',
      '歡樂',
      '抽籤',
      '轉盤',
      '太空艙大吼',
      'spaceteam',
      '大吼',
      '捏泡泡',
      '敲木魚',
      '功德',
      '摸魚',
      '塗鴉',
      '填色',
      '畫畫',
      'casual',
      'party',
      'idle',
      'clicker',
      'funny',
      'relax',
      'doodle',
      'pinball',
    ],
    secondaryKeywords: [
      '輕鬆',
      '簡單',
      '放鬆',
      '小遊戲',
      '好玩',
      '手速',
      '反應',
      '小動物',
      '可愛',
    ],
  },
];

export function classifyGame(params: {
  title?: string;
  appName?: string;
  description?: string;
  tags?: string[];
  demoUrl?: string;
  currentTertiary?: string;
}): GameTertiaryCategory {
  const current = (params.currentTertiary || '').trim();
  if ((GAME_TERTIARY_CATEGORIES as readonly string[]).includes(current)) {
    return current as GameTertiaryCategory;
  }
  if (current === '模擬') return '模擬體驗';
  if (current === '角色扮演' || current === '動作冒險' || current === '冒險') return '多人冒險';
  if (current === '益智' || current === '策略') return '策略益智';
  if (current === '解謎' || current === '劇情' || current === '推理' || current === '視覺小說') return '解謎劇情';
  if (current === '親子' || current === '兒童' || current === '幼兒') return '親子兒童';
  if (current === '浪漫' || current === '戀愛' || current === '甜蜜' || current === '約會') return '甜蜜浪漫';
  if (current === '休閒') return '休閒派對';
  if (current === '競技' || current === '對戰') return '競技對戰';
  if (current === '桌遊' || current === '卡牌') return '卡牌桌遊';
  if (current === '恐怖' || current === '驚悚') return '恐怖驚悚';

  const fullText = [
    params.appName || '',
    params.title || '',
    (params.tags || []).join(' '),
    params.description || '',
    params.demoUrl || '',
  ]
    .join(' ')
    .toLowerCase();

  const scores: Record<GameTertiaryCategory, number> = {
    恐怖驚悚: 0,
    卡牌桌遊: 0,
    競技對戰: 0,
    模擬體驗: 0,
    策略益智: 0,
    多人冒險: 0,
    休閒派對: 0,
    解謎劇情: 0,
    親子兒童: 0,
    甜蜜浪漫: 0,
  };

  for (const rule of GAME_RULES) {
    let score = 0;
    for (const kw of rule.primaryKeywords) {
      const lower = kw.toLowerCase();
      if (fullText.includes(lower)) {
        score += 8;
        if (
          (params.appName || '').toLowerCase().includes(lower) ||
          (params.title || '').toLowerCase().includes(lower)
        ) {
          score += 12;
        }
      }
    }
    for (const kw of rule.secondaryKeywords) {
      const lower = kw.toLowerCase();
      if (fullText.includes(lower)) {
        score += 3;
      }
    }
    scores[rule.category] = score;
  }

  let bestCategory: GameTertiaryCategory = '休閒派對';
  let maxScore = 0;
  for (const cat of GAME_TERTIARY_CATEGORIES) {
    if (scores[cat] > maxScore) {
      maxScore = scores[cat];
      bestCategory = cat;
    }
  }

  if (maxScore === 0) {
    const seedStr = params.appName || params.title || 'game';
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
      hash = (hash * 31 + seedStr.charCodeAt(i)) >>> 0;
    }
    const fallbackList: GameTertiaryCategory[] = [
      '休閒派對',
      '模擬體驗',
      '策略益智',
      '多人冒險',
      '競技對戰',
      '卡牌桌遊',
      '恐怖驚悚',
      '解謎劇情',
      '親子兒童',
      '甜蜜浪漫',
    ];
    return fallbackList[hash % fallbackList.length];
  }

  return bestCategory;
}

export function isGameQuestion(question?: Partial<Question> | null): boolean {
  if (!question) return false;
  if (question.id?.startsWith('game-hot-') || question.id?.startsWith('game-')) return true;
  if (question.subcategory === '遊戲' || question.subcategory === '小遊戲') return true;
  if (
    question.tertiaryCategory &&
    (GAME_TERTIARY_CATEGORIES as readonly string[]).includes(question.tertiaryCategory)
  ) {
    return true;
  }
  if (
    Array.isArray(question.subcategories) &&
    (question.subcategories.includes('遊戲') || question.subcategories.includes('小遊戲'))
  ) {
    return true;
  }
  if (
    Array.isArray(question.tags) &&
    question.tags.some((t) => {
      const lower = String(t || '').toLowerCase();
      return (
        lower === '遊戲' ||
        lower === '小遊戲' ||
        lower === 'game' ||
        lower === 'games' ||
        lower === 'mini-game' ||
        lower.includes('遊戲')
      );
    })
  ) {
    return true;
  }
  const fullText = `${question.appName || ''} ${question.title || ''} ${question.description || ''} ${question.demoUrl || ''} ${question.externalLink || ''}`.toLowerCase();
  if (
    fullText.includes('4388.fun') ||
    fullText.includes('piko2game') ||
    fullText.includes('模擬器') ||
    fullText.includes('小遊戲') ||
    fullText.includes('遊戲')
  ) {
    return true;
  }
  return false;
}

export function getEffectiveTertiaryCategory(question: Partial<Question>): string {
  if (isGameQuestion(question)) {
    return classifyGame({
      title: question.title,
      appName: question.appName,
      description: question.description,
      tags: question.tags,
      demoUrl: question.demoUrl || question.externalLink,
      currentTertiary: question.tertiaryCategory,
    });
  }
  const category = (question.subcategory || '網站程式') as keyof typeof SOFTWARE_TERTIARY_CATEGORIES;
  const validTertiaries: readonly string[] = SOFTWARE_TERTIARY_CATEGORIES[category] || [];
  if (
    question.tertiaryCategory &&
    (validTertiaries.includes(question.tertiaryCategory) || validTertiaries.length === 0)
  ) {
    return question.tertiaryCategory;
  }
  const text = `${question.appName || ''} ${question.title || ''} ${question.description || ''}`.toLowerCase();
  if (category === 'AI工具') {
    if (text.includes('生成') || text.includes('繪圖') || text.includes('影音') || text.includes('圖像')) return '圖像影音';
    if (text.includes('寫作') || text.includes('文章') || text.includes('文案')) return '文本寫作';
    if (text.includes('程式') || text.includes('代碼') || text.includes('code')) return '代碼輔助';
    if (text.includes('分析') || text.includes('數據')) return '數據分析';
    if (text.includes('問答') || text.includes('知識')) return '知識問答';
    return '智能助手';
  }
  if (category === '自動化') {
    if (text.includes('爬蟲') || text.includes('爬取') || text.includes('crawl')) return '資料爬取';
    if (text.includes('機器人') || text.includes('bot') || text.includes('訊息')) return '訊息機器人';
    if (text.includes('排程') || text.includes('定時')) return '定時排程';
    if (text.includes('文件') || text.includes('pdf')) return '文件處理';
    return '流程整合';
  }
  if (category === '擴充功能') {
    if (text.includes('外掛') || text.includes('chrome') || text.includes('瀏覽器')) return '瀏覽器外掛';
    if (text.includes('套件') || text.includes('sdk')) return '開發套件';
    if (text.includes('美化') || text.includes('主題')) return '介面美化';
    return '效率增強';
  }
  if (text.includes('社群') || text.includes('交流') || text.includes('論壇')) return '社群互動';
  if (text.includes('電商') || text.includes('商城') || text.includes('購物') || text.includes('買賣')) return '電商服務';
  if (text.includes('後台') || text.includes('管理') || text.includes('admin')) return '管理後台';
  if (text.includes('媒體') || text.includes('內容') || text.includes('影音') || text.includes('新聞')) return '內容媒體';
  if (text.includes('展示') || text.includes('形象') || text.includes('官網')) return '形象展示';
  return validTertiaries[0] || '實用工具';
}

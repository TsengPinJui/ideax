import { Question, SoftwareCategory, SOFTWARE_TERTIARY_CATEGORIES } from '../types';

/**
 * 使用者指定的 7 大小遊戲第三級分類：
 * 1. 休閒派對
 * 2. 模擬體驗
 * 3. 策略益智
 * 4. 多人冒險
 * 5. 競技對戰
 * 6. 卡牌桌遊
 * 7. 恐怖驚悚
 */
export const GAME_TERTIARY_CATEGORIES = [
  '休閒派對',
  '模擬體驗',
  '策略益智',
  '多人冒險',
  '競技對戰',
  '卡牌桌遊',
  '恐怖驚悚',
] as const;

export type GameTertiaryCategory = typeof GAME_TERTIARY_CATEGORIES[number];

interface CategoryRule {
  category: GameTertiaryCategory;
  primaryKeywords: string[];
  secondaryKeywords: string[];
  excludeKeywords?: string[];
}

const GAME_RULES: CategoryRule[] = [
  {
    category: '恐怖驚悚',
    primaryKeywords: [
      '恐怖', '驚悚', '鬼', '殭屍', '喪屍', '幽靈', '嚇人', '密室逃脫', '詭異', '靈異',
      '噩夢', '惡夢', '殺手', '血腥', '詛咒', '凶宅', '封印', '異形', '屠殺', '亡靈',
      'horror', 'scary', 'spooky', 'thriller', 'ghost', 'zombie', 'fnaf', 'backrooms',
    ],
    secondaryKeywords: [
      '逃生', '怪物', '黑暗', '驚嚇', '逃脫', '死亡', '驚叫', '迷霧', '陰暗', '暗黑',
      'escape', 'dark', 'nightmare', 'creepy',
    ],
  },
  {
    category: '卡牌桌遊',
    primaryKeywords: [
      '卡牌', '桌遊', '抽卡', '撲克', '麻將', '21點', '德州撲克', '狼人殺', '心理戰', '劇本殺',
      '大富翁', '棋盤', '戰棋', '卡組', '牌組', '集換式', '爐石', '塔羅', '骰子', '象棋',
      '圍棋', '五子棋', '黑白棋', '飛行棋', '跳棋', '心智戰', 'card', 'board game', 'deck',
      'poker', 'mahjong', 'blackjack', 'dice', 'solitaire', 'uno', 'tarot', 'chess',
    ],
    secondaryKeywords: [
      '牌', '輪盤', '下棋', '投擲', '抽牌', '出牌', '牌局', '卡包', '對弈',
    ],
  },
  {
    category: '競技對戰',
    primaryKeywords: [
      '競技', '對戰', '對決', 'pvp', 'arena', '擂台', '坦克', '裝甲', '賽車', '競速',
      '格鬥', '拳擊', '足球', '籃球', '網球', '羽球', '棒球', '桌球', '吃雞', '大逃殺',
      '1v1', 'pk', '連線對抗', '彈幕射擊', '戰機', '戰艦', '空戰', '海戰', '狙擊',
      '射箭', '保齡球', '賽馬', '漂移', 'battle', 'tank', 'racing', 'brawl', 'duel',
      'shooter', 'air combat', 'gunfight', 'tanks',
    ],
    secondaryKeywords: [
      '戰鬥', '射擊', '槍戰', '運動', '比賽', '競賽', '比拼', '爭霸', '對抗', '格鬥技',
      '打靶', '速度', 'fight', 'combat', 'race',
    ],
  },
  {
    category: '模擬體驗',
    primaryKeywords: [
      '模擬體驗', '模擬', '料理模擬', '美容模擬', '人生模擬', '經營模擬', '洗澡', '美容',
      '做章魚燒', '章魚燒', '蛋包飯', '螺旋薯塔', '薯塔', '削蘋果', '拉麵', '漢堡', '冰淇淋',
      '土耳其冰淇淋', '狗狗洗澡', '貓咪照顧', '寵物照顧', '農場', '餐廳', '料理', '烹飪',
      '做菜', '烘焙', '煎蛋', '煮麵', '烤肉', '水族館', '城市建造', '打造城市', '城市',
      '彩虹城市', '生活模擬', '職業體驗', '飛行駕駛', '駕駛', '列車', '工廠', '裝修',
      '物理模擬', 'sim', 'simulator', 'tycoon', 'cooking', 'craft', 'dog wash',
      'takoyaki', 'omurice', 'rainbow city',
    ],
    secondaryKeywords: [
      '體驗', '經營', '養成', '建造', '寵物', '照顧', '醫院', '開店', '製作', '生活',
      '職業', '治癒', '療癒', '採礦', '挖掘', '收穫', '80億分之1', 'build', 'farm',
    ],
  },
  {
    category: '策略益智',
    primaryKeywords: [
      '策略益智', '策略', '益智', '解謎', '推箱子', '數獨', '填字', '成語', '迷宮', '腦力',
      '燒腦', '邏輯', '推理', '算術', '數學', '2048', '連連看', '俄羅斯方塊', '消除',
      '三消', '塔防', 'etf', 'etf投資', '投資人生局', '投資', '理財', '現金流', '股票',
      'puzzle', 'logic', 'strategy', 'riddle', 'tower defense', 'tetris', 'match 3',
      'sudoku', 'maze', 'brain', 'finance',
    ],
    secondaryKeywords: [
      '拼圖', '思考', '猜謎', '記憶', '尋寶', '找碴', '佈局', '攻城', '機關', '幾何',
      '密碼', '過關', '算數',
    ],
  },
  {
    category: '多人冒險',
    primaryKeywords: [
      '多人冒險', '冒險', '地下城', '地牢', '探索', '勇者', '打怪', '升級', '裝備', '技能',
      '副本', '聯機', '組隊', '倖存者', '橫向卷軸', '探險', '闖關', '平台跳躍', '奇幻',
      '魔法', '英雄', '拯救', '迷宮探險', '角色扮演', 'rpg', '修仙', '魔王', '史萊姆',
      'adventure', 'dungeon', 'co-op', 'multiplayer', 'quest', 'survivor', 'hero', 'knight',
    ],
    secondaryKeywords: [
      '多人', '跳躍', '障礙', '地底', '寶箱', '秘境', '旅程', '主線', '戰士', '法師',
    ],
  },
  {
    category: '休閒派對',
    primaryKeywords: [
      '休閒派對', '休閒', '派對', '點擊', '放置', '解壓', '趣味', '小品', '搞笑', '惡搞',
      '彈珠', '抓娃娃', '夾娃娃', '音遊', '節奏', '聚會', '破冰', '歡樂', '抽籤', '轉盤',
      '捏泡泡', '敲木魚', '功德', '摸魚', '塗鴉', '填色', '畫畫', 'casual', 'party',
      'idle', 'clicker', 'funny', 'relax', 'doodle', 'pinball',
    ],
    secondaryKeywords: [
      '輕鬆', '簡單', '放鬆', '小遊戲', '好玩', '手速', '反應', '小動物', '可愛',
    ],
  },
];

/**
 * 根據小遊戲的標題、名稱、內文說明、標籤與網址，智能歸納至指定的 7 大遊戲第三級分類
 */
export function classifyGame(params: {
  title?: string;
  appName?: string;
  description?: string;
  tags?: string[];
  demoUrl?: string;
  currentTertiary?: string;
}): GameTertiaryCategory {
  const current = (params.currentTertiary || '').trim();
  if (GAME_TERTIARY_CATEGORIES.includes(current as GameTertiaryCategory)) {
    return current as GameTertiaryCategory;
  }

  // 舊版映射轉換
  if (current === '模擬') return '模擬體驗';
  if (current === '角色扮演' || current === '動作冒險' || current === '冒險') return '多人冒險';
  if (current === '益智' || current === '策略') return '策略益智';
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
    '恐怖驚悚': 0,
    '卡牌桌遊': 0,
    '競技對戰': 0,
    '模擬體驗': 0,
    '策略益智': 0,
    '多人冒險': 0,
    '休閒派對': 0,
  };

  for (const rule of GAME_RULES) {
    let score = 0;
    for (const kw of rule.primaryKeywords) {
      const lower = kw.toLowerCase();
      if (fullText.includes(lower)) {
        score += 8;
        // 若出現在作品名稱或標題，權重加倍
        if ((params.appName || '').toLowerCase().includes(lower) || (params.title || '').toLowerCase().includes(lower)) {
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

  // 找出最高分的類別
  let bestCategory: GameTertiaryCategory = '休閒派對';
  let maxScore = 0;

  for (const cat of GAME_TERTIARY_CATEGORIES) {
    if (scores[cat] > maxScore) {
      maxScore = scores[cat];
      bestCategory = cat;
    }
  }

  // 若所有類別皆為 0 分，透過名稱雜湊給予穩定分佈，覆蓋 7 大分類避免全部擠在單一分類
  if (maxScore === 0) {
    const seedStr = (params.appName || params.title || 'game');
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
    ];
    return fallbackList[hash % fallbackList.length];
  }

  return bestCategory;
}

/**
 * 取得作品的有效第三級分類（適用於遊戲與各類軟體作品）
 */
export function getEffectiveTertiaryCategory(question: Partial<Question>): string {
  const isGame =
    question.subcategory === '遊戲' ||
    (Array.isArray(question.subcategories) && question.subcategories.includes('遊戲')) ||
    (Array.isArray(question.tags) && question.tags.some((t) => t === '遊戲' || t.toLowerCase() === 'game'));

  if (isGame) {
    return classifyGame({
      title: question.title,
      appName: question.appName,
      description: question.description,
      tags: question.tags,
      demoUrl: question.demoUrl || question.externalLink,
      currentTertiary: question.tertiaryCategory,
    });
  }

  // 非遊戲類別，若是既有的合法第三級分類則直接沿用
  const category = (question.subcategory || '網站程式') as SoftwareCategory;
  const validTertiaries = SOFTWARE_TERTIARY_CATEGORIES[category] || [];
  if (question.tertiaryCategory && (validTertiaries.includes(question.tertiaryCategory) || validTertiaries.length === 0)) {
    return question.tertiaryCategory;
  }

  return question.tertiaryCategory || (validTertiaries[0] || '一般');
}

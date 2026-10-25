import { Question } from '../types';
import { SEED_TIME_ANCHOR_MS } from './seedTime';

export interface HotGameDef {
  rank: number;
  id: string;
  title: string;
  heatDisplay: string;
  rawViews: number;
  demoUrl: string;
  externalLink: string;
  description: string;
  category: string;
  subcategory: string;
  tertiaryCategory?: string;
  tags: string[];
  coverImage?: string;
  authorName: string;
  authorTitle: string;
}

/**
 * 嚴格按照使用者上傳之圖一（熱度榜）順序與內容定義之 10 款熱度榜小遊戲：
 * 1. 做章魚燒 — 你的章魚燒幾分？ (17k)
 * 2. 蛋包飯模擬器 | Yorimichi Games (13k)
 * 3. 螺旋薯塔製造機 (13k)
 * 4. 80億分之1 • 你會出生成為誰？ (9.5k)
 * 5. 做漢堡排 — 你的漢堡排幾分？ (8.8k)
 * 6. 二郎系拉麵加量塔 (7.7k)
 * 7. Doodle Coaster (7.6k)
 * 8. 削蘋果皮 (7.6k)
 * 9. 土耳其冰淇淋3D (7.3k)
 * 10. 吉娃娃模擬器 (7.3k)
 */
export const HOT_GAMES_DEFS: HotGameDef[] = [
  {
    rank: 1,
    id: 'game-hot-takoyaki',
    title: '做章魚燒 — 你的章魚燒幾分？',
    heatDisplay: '17k',
    rawViews: 17200,
    demoUrl: 'https://piko2game.com/takoyaki/',
    externalLink: 'https://4388.fun/g/686',
    description: '倒入麵糊、放進章魚，用手指一轉！圓不圓？燒焦了？忘了放章魚？考驗翻轉時機的料理模擬小遊戲。',
    category: '網站程式',
    subcategory: '遊戲',
    tertiaryCategory: '模擬體驗',
    tags: ['遊戲', '料理模擬', '做章魚燒', '網頁小遊戲', '休閒'],
    coverImage: 'https://piko2game.com/assets/takoyaki-cover.jpg?v=2',
    authorName: 'Piko2Game 獨立團隊',
    authorTitle: '休閒遊戲開發者',
  },
  {
    rank: 2,
    id: 'game-hot-omurice',
    title: '蛋包飯模擬器 | Yorimichi Games',
    heatDisplay: '13k',
    rawViews: 13400,
    demoUrl: 'https://yorimichi-games.com/omurice/',
    externalLink: 'https://4388.fun/g/649',
    description: '體驗完整的日式蛋包飯製作過程：打蛋、熱鍋、折疊翻鍋做出完美的半熟歐姆蛋，鋪在雞肉炒飯上再劃開！',
    category: '網站程式',
    subcategory: '遊戲',
    tertiaryCategory: '模擬體驗',
    tags: ['遊戲', '蛋包飯模擬器', '料理模擬', 'Yorimichi', '療癒小品'],
    coverImage: 'https://yorimichi-games.com/omurice/ogp.png',
    authorName: 'Yorimichi Games',
    authorTitle: '日系獨立遊戲工作室',
  },
  {
    rank: 3,
    id: 'game-hot-spiralpotato',
    title: '螺旋薯塔製造機',
    heatDisplay: '13k',
    rawViews: 13100,
    demoUrl: 'https://x282665.com/games/long-potato/',
    externalLink: 'https://4388.fun/g/856',
    description: '將整顆馬鈴薯旋轉削切成連續不斷的螺旋薯塔！考驗你的手感穩定度，看你能拉到多長！',
    category: '網站程式',
    subcategory: '遊戲',
    tertiaryCategory: '休閒派對',
    tags: ['遊戲', '螺旋薯塔', '休閒模擬', '解壓小遊戲'],
    coverImage: 'https://x282665.com/games/long-potato/ogp.png',
    authorName: 'X282665 Labs',
    authorTitle: '互動網頁實驗室',
  },
  {
    rank: 4,
    id: 'game-hot-1in8b',
    title: '80億分之1 • 你會出生成為誰？',
    heatDisplay: '9.5k',
    rawViews: 9500,
    demoUrl: 'https://1in8b.life/zh/',
    externalLink: 'https://1in8b.life/zh/',
    description: '以地球真實人口分佈數據為基礎，隨機抽選並體驗此刻在世界某個角落剛出生的某個人的一生。',
    category: '網站程式',
    subcategory: '遊戲',
    tertiaryCategory: '模擬體驗',
    tags: ['遊戲', '人生模擬', '80億分之1', '隨機人生', '哲學'],
    coverImage: 'https://1in8b.life/og.png',
    authorName: 'Global Life Project',
    authorTitle: '數據敘事創作團隊',
  },
  {
    rank: 5,
    id: 'game-hot-hamburg',
    title: '做漢堡排 — 你的漢堡排幾分？',
    heatDisplay: '8.8k',
    rawViews: 8800,
    demoUrl: 'https://piko2game.com/hamburg/',
    externalLink: 'https://4388.fun/g/687',
    description: '拍打絞肉排除空氣、掌控火候兩面微焦鎖住肉汁，淋上特製多蜜醬！你能煎出多汁的滿分漢堡排嗎？',
    category: '網站程式',
    subcategory: '遊戲',
    tertiaryCategory: '模擬體驗',
    tags: ['遊戲', '漢堡排', '料理模擬', 'Piko2Game'],
    coverImage: 'https://piko2game.com/assets/hamburg-cover.jpg',
    authorName: 'Piko2Game 獨立團隊',
    authorTitle: '休閒遊戲開發者',
  },
  {
    rank: 6,
    id: 'game-hot-jiro-ramen',
    title: '二郎系拉麵加量塔',
    heatDisplay: '7.7k',
    rawViews: 7700,
    demoUrl: 'https://game.su10.dev/jiro-mashimashi-tower/',
    externalLink: 'https://4388.fun/g/747',
    description: '豆芽菜、蒜泥、豬背脂加量！挑戰把二郎系拉麵配料堆疊成極限加量塔，小心不要崩塌！',
    category: '網站程式',
    subcategory: '遊戲',
    tertiaryCategory: '策略益智',
    tags: ['遊戲', '二郎系拉麵', '拉麵加量塔', '挑戰極限'],
    authorName: 'su10.dev',
    authorTitle: '獨立網頁遊戲創作者',
  },
  {
    rank: 7,
    id: 'game-hot-doodle-coaster',
    title: 'Doodle Coaster',
    heatDisplay: '7.6k',
    rawViews: 7600,
    demoUrl: 'https://rakugaki-coaster.pages.dev/',
    externalLink: 'https://4388.fun/g/692',
    description: '自由手繪任何曲線軌道，系統立即生成 3D 雲霄飛車，並切換第一人稱視角親身體驗乘車快感！',
    category: '網站程式',
    subcategory: '遊戲',
    tertiaryCategory: '休閒派對',
    tags: ['遊戲', 'Doodle Coaster', '手繪雲霄飛車', '物理模擬'],
    authorName: 'Rakugaki Lab',
    authorTitle: '物理遊戲開發者',
  },
  {
    rank: 8,
    id: 'game-hot-apple-peel',
    title: '削蘋果皮',
    heatDisplay: '7.6k',
    rawViews: 7600,
    demoUrl: 'https://ringo-no-kawamuki.pages.dev/',
    externalLink: 'https://4388.fun/g/857',
    description: '指尖滑動細膩運刀，挑戰一刀不段將整顆紅蘋果皮完美削完！極致解壓與考驗手感的小遊戲。',
    category: '網站程式',
    subcategory: '遊戲',
    tertiaryCategory: '休閒派對',
    tags: ['遊戲', '削蘋果皮', '解壓小遊戲', '休閒技巧'],
    authorName: 'Ringo Studio',
    authorTitle: '解壓遊戲創作者',
  },
  {
    rank: 9,
    id: 'game-hot-turkish-icecream',
    title: '土耳其冰淇淋3D',
    heatDisplay: '7.3k',
    rawViews: 7320,
    demoUrl: 'https://x282665.com/games/turkish-ice-cream-3d/',
    externalLink: 'https://4388.fun/g/1215',
    description: '3D 互動模擬！體驗土耳其冰淇淋老闆經典的華麗特技與捉弄顧客把戲，看你能否搶到甜筒！',
    category: '網站程式',
    subcategory: '遊戲',
    tertiaryCategory: '休閒派對',
    tags: ['遊戲', '土耳其冰淇淋3D', '3D模擬', '搞笑互動'],
    authorName: 'X282665 Labs',
    authorTitle: '3D 網頁實驗團隊',
  },
  {
    rank: 10,
    id: 'game-hot-chihuahua',
    title: '吉娃娃模擬器',
    heatDisplay: '7.3k',
    rawViews: 7300,
    demoUrl: 'https://chihuahua-sim.pages.dev/',
    externalLink: 'https://4388.fun/g/677',
    description: '以網路迷因吉娃娃為主角的趣味模擬器，體驗 50% 顫抖 + 50% 狂吠的奇妙吉娃娃日常！',
    category: '網站程式',
    subcategory: '遊戲',
    tertiaryCategory: '休閒派對',
    tags: ['遊戲', '吉娃娃模擬器', '迷因', '魔性休閒'],
    authorName: 'Chihuahua Dev',
    authorTitle: '迷因遊戲開發者',
  },
];

/**
 * 將熱度榜資料轉換為標準的 Question 物件，可直接嵌入 FullscreenAppEmbedView 與全站相容
 */
export function createHotGameQuestion(def: HotGameDef): Question {
  return {
    id: def.id,
    appName: def.title.split('—')[0]?.split('|')[0]?.trim() || def.title,
    title: def.title,
    description: def.description,
    category: '網站程式',
    subcategory: '遊戲',
    subcategories: ['遊戲'],
    tertiaryCategory: def.tertiaryCategory || '休閒派對',
    tags: def.tags,
    level: 'L0',
    bounty: 0,
    status: 'open',
    authorId: `author-${def.id}`,
    authorName: def.authorName,
    authorTitle: def.authorTitle,
    authorAvatar: `/avatars/game-icon-${def.rank}.svg`,
    createdAt: new Date(SEED_TIME_ANCHOR_MS - def.rank * 3600000 * 4).toISOString(),
    deadline: new Date(Date.now() + 86400000 * 60).toISOString(),
    views: 0,
    likes: 0,
    secondedCount: 0,
    sameQuestionCount: Math.round(def.rawViews * 0.015),
    answersCount: Math.max(3, Math.round(def.rawViews * 0.005)),
    postType: 'vibecoding_app',
    specialZone: 'vibecoding',
    previewMode: 'embed',
    demoUrl: def.demoUrl,
    externalLink: def.externalLink,
    coverImage: def.coverImage,
    currentVersion: 'v1.0.0',
    isFeatured: def.rank <= 3,
    experienceThumbsUpCount: Math.round(def.rawViews * 0.075),
    experienceNeutralCount: Math.round(def.rawViews * 0.004),
    experienceThumbsDownCount: Math.round(def.rawViews * 0.001),
    experienceScore: 98 - def.rank,
    experienceRatingsCount: Math.round(def.rawViews * 0.08),
    heatDisplay: def.heatDisplay,
  } as Question;
}

/**
 * 取得熱度榜前 10 名的完整 Question 物件清單
 */
export function getHotRankedGames(allQuestions?: Question[]): { question: Question; heat: string; rank: number }[] {
  const qMap = new Map((allQuestions || []).map((q) => [q.id, q]));
  return HOT_GAMES_DEFS.map((def) => {
    const existing = qMap.get(def.id);
    const q = existing ? { ...existing, demoUrl: existing.demoUrl || def.demoUrl, previewMode: 'embed' as const } : createHotGameQuestion(def);
    return {
      question: q,
      heat: def.heatDisplay,
      rank: def.rank,
    };
  });
}

/**
 * 取得精選遊戲（前 10 名）
 * 優先選取所有 category === '遊戲' 或 subcategory === '遊戲' 且 isFeatured 或評分最高的軟體/遊戲作品
 */
export function getFeaturedGames(allQuestions: Question[] = []): { question: Question; score: number; rank: number }[] {
  const isGame = (q: Question) => {
    if (q.status === 'delisted' || q.status === 'closed') return false;
    const cat = q.category || '';
    const sub = q.subcategory || '';
    const subs = q.subcategories || [];
    const tags = q.tags || [];
    const title = q.title || '';
    const desc = q.description || '';
    return (
      (cat as string) === '遊戲' ||
      sub === '遊戲' ||
      subs.includes('遊戲') ||
      tags.includes('遊戲') ||
      tags.includes('小遊戲') ||
      title.includes('遊戲') ||
      title.includes('桌遊') ||
      title.includes('RPG') ||
      desc.includes('網頁遊戲')
    );
  };

  const gameQuestions = allQuestions.filter(isGame);

  // 排序標準：isFeatured 優先，其次讚數+評分+熱度
  const sorted = [...gameQuestions].sort((a, b) => {
    const aFeatured = a.isFeatured ? 1 : 0;
    const bFeatured = b.isFeatured ? 1 : 0;
    if (aFeatured !== bFeatured) return bFeatured - aFeatured;
    const aScore = (a.experienceScore || 90) * 10 + (a.likes || 0) * 2 + (a.views || 0) * 0.05;
    const bScore = (b.experienceScore || 90) * 10 + (b.likes || 0) * 2 + (b.views || 0) * 0.05;
    return bScore - aScore;
  });

  // 如果不滿 10 款，從熱度榜與預設遊戲中智能補齊，確保永遠呈現高水準的精選 TOP 10
  const result: Question[] = [];
  const seenIds = new Set<string>();

  for (const g of sorted) {
    if (result.length >= 10) break;
    if (!seenIds.has(g.id)) {
      seenIds.add(g.id);
      result.push(g);
    }
  }

  if (result.length < 10) {
    for (const def of HOT_GAMES_DEFS) {
      if (result.length >= 10) break;
      if (!seenIds.has(def.id)) {
        seenIds.add(def.id);
        result.push(createHotGameQuestion(def));
      }
    }
  }

  return result.slice(0, 10).map((question, idx) => ({
    question: {
      ...question,
      demoUrl: question.demoUrl || (question as any).vibeCodingData?.demoUrl || 'https://4388.fun/',
      previewMode: 'embed' as const,
    },
    score: question.experienceScore || (99 - idx),
    rank: idx + 1,
  }));
}

/**
 * 隨機抽取 3 款遊戲
 * 整合全站現有遊戲、熱度榜 10 款小遊戲與精選庫，排除下架或非遊戲作品，
 * 每次隨機洗牌並回傳 3 款獨立不重複的優質遊戲！
 */
export function getRandomThreeGames(
  allQuestions: Question[] = [],
  excludeIds: string[] = []
): Question[] {
  const isGame = (q: Question) => {
    if (q.status === 'delisted' || q.status === 'closed') return false;
    const cat = q.category || '';
    const sub = q.subcategory || '';
    const subs = q.subcategories || [];
    const tags = q.tags || [];
    const title = q.title || '';
    const desc = q.description || '';
    return (
      (cat as string) === '遊戲' ||
      sub === '遊戲' ||
      subs.includes('遊戲') ||
      tags.includes('遊戲') ||
      tags.includes('小遊戲') ||
      title.includes('遊戲') ||
      title.includes('模擬器') ||
      title.includes('桌遊') ||
      title.includes('RPG') ||
      desc.includes('網頁遊戲') ||
      desc.includes('小遊戲')
    );
  };

  const pool: Question[] = [];
  const seenIds = new Set<string>();

  // 1. 先加入全站符合遊戲條件的作品
  for (const q of allQuestions) {
    if (isGame(q) && !seenIds.has(q.id)) {
      seenIds.add(q.id);
      pool.push({
        ...q,
        demoUrl: q.demoUrl || (q as any).vibeCodingData?.demoUrl || q.externalLink || 'https://4388.fun/',
        previewMode: 'embed' as const,
      });
    }
  }

  // 2. 加入預設熱度榜 10 款經典遊戲（保底庫存豐富）
  for (const def of HOT_GAMES_DEFS) {
    if (!seenIds.has(def.id)) {
      seenIds.add(def.id);
      pool.push(createHotGameQuestion(def));
    }
  }

  if (pool.length === 0) return [];

  // 優先避開前一次抽中的 ID (若總數大於 3)
  const excludeSet = new Set(excludeIds);
  let candidates = pool.filter((g) => !excludeSet.has(g.id));
  if (candidates.length < 3) {
    candidates = [...pool];
  }

  // Fisher-Yates 洗牌演算法隨機打亂
  const shuffled = [...candidates];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, 3);
}

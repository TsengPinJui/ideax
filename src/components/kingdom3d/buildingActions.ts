import type { RegionId } from './types';

/**
 * 每棟建築在左側面板裡可以直接點選的功能按鈕。
 * - module：離開 3D 前往平台上的對應頁面（App 會轉成島覽的同一套動作）
 * - painFloor：在面板裡直接打開創點樓某一層的痛點
 * - region：瞬移到另一座島
 * - map：打開全島地圖
 */
export type KingdomAction =
  | { kind: 'module'; module: string }
  | { kind: 'painFloor'; level: number }
  | { kind: 'region'; regionId: RegionId }
  | { kind: 'map' };

export interface KingdomActionButton {
  label: string;
  hint?: string;
  action: KingdomAction;
  primary?: boolean;
}

const mod = (module: string) => ({ kind: 'module', module }) as KingdomAction;

export const BUILDING_ACTIONS: Record<string, KingdomActionButton[]> = {
  'home-explore': [
    { label: '看全站最新內容', hint: '問題、痛點、討論、作品一次逛', action: mod('home'), primary: true },
    { label: '痛點懸賞牆', hint: '大家正在找解法的痛點', action: mod('pain_feed') },
    { label: '交流討論', hint: '各主題的討論串', action: mod('discussion_feed') },
    { label: '作品展', hint: '軟體、遊戲與 AI 工具', action: mod('vibecoding_feed') },
    { label: '創點子提案', hint: '創新提案專區', action: mod('ideas_feed') },
  ],
  'home-map': [
    { label: '打開全島地圖', hint: '點島就能瞬移', action: { kind: 'map' }, primary: true },
    { label: '前往痛點島', action: { kind: 'region', regionId: 'region-pain' } },
    { label: '前往討論島', action: { kind: 'region', regionId: 'region-discussion' } },
    { label: '前往創意島', action: { kind: 'region', regionId: 'region-creative' } },
    { label: '前往徵才島', action: { kind: 'region', regionId: 'region-career' } },
  ],
  'home-agents': [{ label: '查看 AI 角色介紹', hint: '職位、出沒地點與虛擬身分證', action: mod('agents'), primary: true }],
  'pain-innovation-tower': [
    { label: '一樓・日常疑難', action: { kind: 'painFloor', level: 1 }, primary: true },
    { label: '地下一樓・創新創業', action: { kind: 'painFloor', level: 0 } },
    { label: '二樓・專業問題', action: { kind: 'painFloor', level: 2 } },
    { label: '三樓・學術探討', action: { kind: 'painFloor', level: 3 } },
    { label: '刊登痛點', action: mod('create_pain_point') },
    { label: '痛點專區', hint: '在平台上看全部痛點', action: mod('pain_feed') },
  ],
  'discussion-library': [
    { label: '逛交流討論', action: mod('discussion_feed'), primary: true },
    { label: '發起討論', action: mod('create_discussion') },
  ],
  'discussion-workshop': [
    { label: '逛交流討論', action: mod('discussion_feed'), primary: true },
    { label: '發起討論', action: mod('create_discussion') },
  ],
  'discussion-street': [
    { label: '逛交流討論', action: mod('discussion_feed'), primary: true },
    { label: '發起討論', action: mod('create_discussion') },
  ],
  'creative-exhibition': [
    { label: '逛作品展', hint: '軟體應用、AI 工具與遊戲', action: mod('vibecoding_feed'), primary: true },
    { label: '創點子提案', action: mod('ideas_feed') },
    { label: '上架作品', action: mod('create_app') },
    { label: '發表創新提案', action: mod('create_proposal') },
  ],
  'creative-arcade': [
    { label: '逛遊戲與作品', action: mod('vibecoding_feed'), primary: true },
    { label: '上架遊戲作品', action: mod('create_app') },
  ],
  'career-academy': [{ label: '找專家', hint: '翰林院各領域專家', action: mod('experts'), primary: true }],
  'career-temple': [{ label: '找職缺', hint: '比對全網匯職缺', action: mod('jobs'), primary: true }],
  'hanlin-headhunter': [{ label: '委託專家媒合', action: mod('experts'), primary: true }],
};

/** 沒有特別設定的建築：依原本的 targetModule 給一個前往按鈕 */
export function actionsForBuilding(id: string, targetModule?: string, label?: string): KingdomActionButton[] {
  const list = BUILDING_ACTIONS[id];
  if (list) return list;
  if (!targetModule) return [];
  return [{ label: label || '前往', action: mod(targetModule), primary: true }];
}

/** 各功能在網站上的網址（3D 裡要跳出去瀏覽或填寫時，用新分頁開，不動到 3D 這一頁） */
const MODULE_URLS: Record<string, string> = {
  home: '/explore',
  explore: '/explore',
  pain_feed: '/painpoints',
  pain_points: '/painpoints',
  discussion_feed: '/l0-discussion',
  l0_discussion: '/l0-discussion',
  vibecoding_feed: '/vibecoding',
  vibecoding: '/vibecoding',
  ideas_feed: '/create-ideas',
  create_ideas: '/create-ideas',
  jobs: '/jobs',
  job_explorer: '/jobs',
  experts: '/solvers',
  solvers: '/solvers',
  create_pain_point: '/painpoints/create',
  create_discussion: '/l0-discussion/create',
  create_app: '/vibecoding/publish',
  create_proposal: '/publish/proposal',
  agents: '/agents',
  topup: '/topup',
  chat: '/chat',
  star_season: '/challenge',
};

export function moduleUrl(module: string) {
  return MODULE_URLS[module] || '/explore';
}

/** 開新分頁（同網站，保留登入狀態）；被瀏覽器擋下時退回在本頁開 */
export function openInNewTab(path: string) {
  const w = window.open(path, '_blank');
  if (w) {
    try {
      w.opener = null;
    } catch {
      // ignore
    }
    return true;
  }
  return false;
}

/** 創點樓一樓天井裡的設施：舞台、提案桌（點了在左側顯示說明與按鈕） */
export const FEATURE_INFO: Record<'stage' | 'proposal', { title: string; badge: string; sub: string; desc: string; actions: KingdomActionButton[] }> = {
  stage: {
    title: '創點舞台',
    badge: '創點樓・一樓',
    sub: '提案發表・創星季',
    desc: '天井西側的戲台，是發表提案、創星季競賽與活動的舞台。',
    actions: [
      { label: '前往創星季', hint: '競賽說明、賽程與報名', action: mod('star_season'), primary: true },
      { label: '逛創點子提案', hint: '大家發表的創新提案', action: mod('ideas_feed') },
    ],
  },
  proposal: {
    title: '提案桌',
    badge: '創點樓・一樓',
    sub: '把點子寫成創新提案',
    desc: '看完懸賞牆上的痛點，有了解法就在這張桌子寫成創新提案。',
    actions: [
      { label: '發表創新提案', hint: '在新分頁填寫', action: mod('create_proposal'), primary: true },
      { label: '逛創點子提案', action: mod('ideas_feed') },
      { label: '報名創星季', action: mod('star_season') },
    ],
  },
};

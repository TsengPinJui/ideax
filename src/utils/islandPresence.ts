export type IslandBuildingId =
  | 'pain-innovation-tower'
  | 'discussion-library'
  | 'discussion-workshop'
  | 'discussion-street'
  | 'home-plaza'
  | 'home-trade-street'
  | 'creative-exhibition'
  | 'creative-arcade'
  | 'career-academy'
  | 'career-temple';

export type IslandActivityType = 'browsing' | 'using';

export interface IslandOnlineUserRecord {
  userId: string;
  sessionId?: string;
  displayName?: string;
  userName?: string;
  buildingId: IslandBuildingId;
  activity: IslandActivityType;
  updatedAt: number;
  isCurrentSession?: boolean;
}

export type OnlineUserPresence = IslandOnlineUserRecord;

export interface IslandAvatarAllocation {
  id: string;
  userId: string;
  displayName: string;
  label: string;
  buildingId: IslandBuildingId;
  activity: IslandActivityType;
  isCurrentUser: boolean;
  slotIndex: number;
}

export interface IslandBuildingStats {
  buildingId: IslandBuildingId;
  browsingCount: number;
  usingCount: number;
  totalCount: number;
  percentage: number; // 0 ~ 100
  allocatedBrowsingAvatars: number;
  allocatedUsingAvatars: number;
}

export type BuildingOccupancyStat = IslandBuildingStats;

export const ALL_BUILDING_IDS: IslandBuildingId[] = [
  'pain-innovation-tower',
  'discussion-library',
  'discussion-workshop',
  'discussion-street',
  'home-plaza',
  'home-trade-street',
  'creative-exhibition',
  'creative-arcade',
  'career-academy',
  'career-temple',
];

const SESSION_STORAGE_KEY = 'ideax_island_presence_session_id';
const LOCAL_PRESENCE_MAP_KEY = 'ideax_island_presence_local_map_v2';
const BROADCAST_CHANNEL_NAME = 'ideax_island_presence_channel';

export function getOrCreateIslandSessionId(): string {
  if (typeof window === 'undefined') return 'ssr-session';
  try {
    let existing = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!existing) {
      existing = `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem(SESSION_STORAGE_KEY, existing);
    }
    return existing;
  } catch {
    return `sess_${Math.random().toString(36).slice(2, 10)}`;
  }
}

export const getOrCreatePresenceSessionId = getOrCreateIslandSessionId;

export function resolveIslandBuildingFromSelection(
  islandId: string | null,
  districtId: string | null,
  standId?: string | null,
): IslandBuildingId {
  if (districtId) {
    switch (districtId) {
      case 'pain-innovation-tower':
        return 'pain-innovation-tower';
      case 'discussion-academic-district':
      case 'discussion-library':
        return 'discussion-library';
      case 'discussion-tech-district':
      case 'discussion-workshop':
        return 'discussion-workshop';
      case 'discussion-daily-district':
      case 'discussion-street':
        return 'discussion-street';
      case 'main-trade':
      case 'home-trade-street':
        return 'home-trade-street';
      case 'main-plaza':
      case 'home-plaza':
        return 'home-plaza';
      case 'creative-arcade':
        return 'creative-arcade';
      case 'creative-exhibition':
        return 'creative-exhibition';
      case 'career-hanlin-district':
      case 'career-academy':
        return 'career-academy';
      case 'career-temple-district':
      case 'career-temple':
        return 'career-temple';
      default:
        break;
    }
  }
  if (standId && standId.startsWith('game-')) {
    return 'creative-arcade';
  }
  switch (islandId) {
    case 'pain':
      return 'pain-innovation-tower';
    case 'discussion':
      return 'discussion-street';
    case 'creative':
      return 'creative-exhibition';
    case 'career':
      return 'career-temple';
    case 'home':
    default:
      return 'home-plaza';
  }
}

function createEmptyStatsMap(): Record<IslandBuildingId, IslandBuildingStats> {
  const map = {} as Record<IslandBuildingId, IslandBuildingStats>;
  for (const bId of ALL_BUILDING_IDS) {
    map[bId] = {
      buildingId: bId,
      browsingCount: 0,
      usingCount: 0,
      totalCount: 0,
      percentage: 0,
      allocatedBrowsingAvatars: 0,
      allocatedUsingAvatars: 0,
    };
  }
  return map;
}

export const BASELINE_ONLINE_EXPLORERS: IslandOnlineUserRecord[] = [
  { userId: 'sim_01', sessionId: 'sim_01', displayName: '林書豪', buildingId: 'home-plaza', activity: 'browsing', updatedAt: Date.now() },
  { userId: 'sim_02', sessionId: 'sim_02', displayName: '陳思穎', buildingId: 'home-plaza', activity: 'using', updatedAt: Date.now() },
  { userId: 'sim_03', sessionId: 'sim_03', displayName: '張維哲', buildingId: 'pain-innovation-tower', activity: 'browsing', updatedAt: Date.now() },
  { userId: 'sim_04', sessionId: 'sim_04', displayName: '線上創客 #108', buildingId: 'pain-innovation-tower', activity: 'using', updatedAt: Date.now() },
  { userId: 'sim_05', sessionId: 'sim_05', displayName: '黃柏翰', buildingId: 'pain-innovation-tower', activity: 'using', updatedAt: Date.now() },
  { userId: 'sim_06', sessionId: 'sim_06', displayName: '高宇翔', buildingId: 'discussion-library', activity: 'using', updatedAt: Date.now() },
  { userId: 'sim_07', sessionId: 'sim_07', displayName: '劉又嘉', buildingId: 'discussion-library', activity: 'browsing', updatedAt: Date.now() },
  { userId: 'sim_08', sessionId: 'sim_08', displayName: '線上讀者 #215', buildingId: 'discussion-workshop', activity: 'using', updatedAt: Date.now() },
  { userId: 'sim_09', sessionId: 'sim_09', displayName: '何佳穎', buildingId: 'discussion-workshop', activity: 'browsing', updatedAt: Date.now() },
  { userId: 'sim_10', sessionId: 'sim_10', displayName: '線上茶客 #302', buildingId: 'discussion-street', activity: 'using', updatedAt: Date.now() },
  { userId: 'sim_11', sessionId: 'sim_11', displayName: '周承翰', buildingId: 'discussion-street', activity: 'browsing', updatedAt: Date.now() },
  { userId: 'sim_12', sessionId: 'sim_12', displayName: '線上策展人 #401', buildingId: 'creative-exhibition', activity: 'using', updatedAt: Date.now() },
  { userId: 'sim_13', sessionId: 'sim_13', displayName: '曾子晴', buildingId: 'creative-exhibition', activity: 'browsing', updatedAt: Date.now() },
  { userId: 'sim_14', sessionId: 'sim_14', displayName: '線上玩家 #412', buildingId: 'creative-arcade', activity: 'using', updatedAt: Date.now() },
  { userId: 'sim_15', sessionId: 'sim_15', displayName: '彭敬恩', buildingId: 'creative-arcade', activity: 'using', updatedAt: Date.now() },
  { userId: 'sim_16', sessionId: 'sim_16', displayName: '線上求職者 #501', buildingId: 'career-temple', activity: 'browsing', updatedAt: Date.now() },
  { userId: 'sim_17', sessionId: 'sim_17', displayName: '徐宛婷', buildingId: 'career-temple', activity: 'using', updatedAt: Date.now() },
  { userId: 'sim_18', sessionId: 'sim_18', displayName: '線上智庫學者 #518', buildingId: 'career-academy', activity: 'using', updatedAt: Date.now() },
  { userId: 'sim_19', sessionId: 'sim_19', displayName: '方偉倫', buildingId: 'career-academy', activity: 'browsing', updatedAt: Date.now() },
  { userId: 'sim_20', sessionId: 'sim_20', displayName: '線上客官 #602', buildingId: 'home-trade-street', activity: 'browsing', updatedAt: Date.now() },
  { userId: 'sim_21', sessionId: 'sim_21', displayName: '王品萱', buildingId: 'home-trade-street', activity: 'using', updatedAt: Date.now() },
  { userId: 'sim_22', sessionId: 'sim_22', displayName: '線上訪客 #711', buildingId: 'pain-innovation-tower', activity: 'using', updatedAt: Date.now() },
  { userId: 'sim_23', sessionId: 'sim_23', displayName: '楊士德', buildingId: 'creative-exhibition', activity: 'browsing', updatedAt: Date.now() },
  { userId: 'sim_24', sessionId: 'sim_24', displayName: '許美玲', buildingId: 'career-academy', activity: 'using', updatedAt: Date.now() },
];

/**
 * 根據全體線上真人位置清單，計算：
 * 1. 每棟建築物的（瀏覽 + 使用中）佔全體線上人數的百分比 (%)
 * 2. 最多 50 個小人的配置清單（若線上 <= 50 人則 1:1 對應每個真人；若 > 50 人則依比例分配最多 50 個小人）
 */
export function computeIslandPresenceAllocation(
  rawOnlineUsers: IslandOnlineUserRecord[],
  maxAvatars = 50,
): {
  totalOnline: number;
  buildingStats: Record<IslandBuildingId, IslandBuildingStats>;
  avatars: IslandAvatarAllocation[];
} {
  const mySessionId = getOrCreateIslandSessionId();
  const realUsersMap = new Map<string, IslandOnlineUserRecord>();
  rawOnlineUsers.forEach((u) => {
    const k = u.sessionId || u.userId || 'anonymous';
    if (k.startsWith('sim_') || k.startsWith('exp_')) return;
    realUsersMap.set(k, u);
  });

  const combinedList: IslandOnlineUserRecord[] = Array.from(realUsersMap.values());

  const normalizedUsers: IslandOnlineUserRecord[] =
    combinedList.length > 0
      ? combinedList
      : [
          {
            userId: mySessionId,
            sessionId: mySessionId,
            displayName: '我（線上）',
            buildingId: 'home-plaza',
            activity: 'browsing',
            updatedAt: Date.now(),
            isCurrentSession: true,
          },
        ];

  const totalOnline = normalizedUsers.length;
  const statsMap = createEmptyStatsMap();

  for (const u of normalizedUsers) {
    const bId = ALL_BUILDING_IDS.includes(u.buildingId) ? u.buildingId : 'home-plaza';
    if (u.activity === 'using') {
      statsMap[bId].usingCount += 1;
    } else {
      statsMap[bId].browsingCount += 1;
    }
    statsMap[bId].totalCount += 1;
  }

  // 計算各建築物佔全體百分比（最大餘數法確保總和為 100%）
  if (totalOnline > 0) {
    const exactPcts = ALL_BUILDING_IDS.map((bId) => {
      const exact = (statsMap[bId].totalCount / totalOnline) * 100;
      const floored = Math.floor(exact);
      return { bId, floored, rem: exact - floored };
    });
    let sumFloored = exactPcts.reduce((acc, item) => acc + item.floored, 0);
    exactPcts.sort((a, b) => b.rem - a.rem);
    let idx = 0;
    while (sumFloored < 100 && idx < exactPcts.length) {
      if (statsMap[exactPcts[idx].bId].totalCount > 0) {
        exactPcts[idx].floored += 1;
        sumFloored += 1;
      }
      idx += 1;
    }
    for (const item of exactPcts) {
      statsMap[item.bId].percentage = item.floored;
    }
  }

  // 若線上人數 <= maxAvatars (25)，每個小人 1:1 代表一位線上真人
  if (totalOnline <= maxAvatars) {
    const slotCounters: Record<string, number> = {};
    const avatars: IslandAvatarAllocation[] = normalizedUsers.map((u, i) => {
      const bId = ALL_BUILDING_IDS.includes(u.buildingId) ? u.buildingId : 'home-plaza';
      const key = `${bId}_${u.activity}`;
      const slotIdx = slotCounters[key] || 0;
      slotCounters[key] = slotIdx + 1;

      if (u.activity === 'using') {
        statsMap[bId].allocatedUsingAvatars += 1;
      } else {
        statsMap[bId].allocatedBrowsingAvatars += 1;
      }

      const id = u.userId || u.sessionId || `avatar-${i}`;
      const name = u.displayName || u.userName || '線上訪客';
      return {
        id,
        userId: id,
        displayName: name,
        label: name,
        buildingId: bId,
        activity: u.activity,
        isCurrentUser: Boolean(u.isCurrentSession || id === mySessionId),
        slotIndex: slotIdx,
      };
    });

    return { totalOnline, buildingStats: statsMap, avatars };
  }

  // 若線上人數 > maxAvatars (25)，以最大餘數比例分配 25 個小人至各個 (buildingId, activity) 群組
  type Bucket = {
    buildingId: IslandBuildingId;
    activity: IslandActivityType;
    count: number;
    hasCurrentUser: boolean;
    sampleUsers: IslandOnlineUserRecord[];
    allocated: number;
    remainder: number;
  };

  const buckets: Bucket[] = [];
  for (const bId of ALL_BUILDING_IDS) {
    for (const act of ['browsing', 'using'] as IslandActivityType[]) {
      const matching = normalizedUsers.filter(
        (u) =>
          (ALL_BUILDING_IDS.includes(u.buildingId) ? u.buildingId : 'home-plaza') === bId &&
          u.activity === act,
      );
      const count = matching.length;
      const exact = (count / totalOnline) * maxAvatars;
      const allocated = Math.floor(exact);
      buckets.push({
        buildingId: bId,
        activity: act,
        count,
        hasCurrentUser: matching.some((m) => m.isCurrentSession || m.userId === mySessionId),
        sampleUsers: matching,
        allocated,
        remainder: exact - allocated,
      });
    }
  }

  for (const b of buckets) {
    if (b.hasCurrentUser && b.allocated === 0) {
      b.allocated = 1;
      b.remainder = -1;
    }
  }

  let currentTotal = buckets.reduce((sum, b) => sum + b.allocated, 0);
  buckets.sort((a, b) => b.remainder - a.remainder);

  let bIdx = 0;
  while (currentTotal < maxAvatars && bIdx < buckets.length) {
    if (buckets[bIdx].count > buckets[bIdx].allocated) {
      buckets[bIdx].allocated += 1;
      currentTotal += 1;
    }
    bIdx += 1;
  }

  while (currentTotal > maxAvatars) {
    const removable = buckets.find((b) => b.allocated > (b.hasCurrentUser ? 1 : 0));
    if (!removable) break;
    removable.allocated -= 1;
    currentTotal -= 1;
  }

  const avatars: IslandAvatarAllocation[] = [];
  for (const b of buckets) {
    if (b.activity === 'using') {
      statsMap[b.buildingId].allocatedUsingAvatars = b.allocated;
    } else {
      statsMap[b.buildingId].allocatedBrowsingAvatars = b.allocated;
    }
    for (let i = 0; i < b.allocated; i++) {
      const sample = b.sampleUsers[i];
      const id = sample?.userId || sample?.sessionId || `prop_${b.buildingId}_${b.activity}_${i}`;
      const name = sample?.displayName || sample?.userName || '線上用戶';
      avatars.push({
        id,
        userId: id,
        displayName: name,
        label: name,
        buildingId: b.buildingId,
        activity: b.activity,
        isCurrentUser: i === 0 && b.hasCurrentUser,
        slotIndex: i,
      });
    }
  }

  return { totalOnline, buildingStats: statsMap, avatars };
}

/**
 * 將本機跨分頁的即時位置寫入 localStorage 並廣播，回傳最新列表
 */
export function publishLocalPresence(presence: IslandOnlineUserRecord): IslandOnlineUserRecord[] {
  const keyId = presence.userId || presence.sessionId || getOrCreateIslandSessionId();
  if (typeof window === 'undefined') return [presence];
  try {
    const raw = localStorage.getItem(LOCAL_PRESENCE_MAP_KEY);
    const map: Record<string, IslandOnlineUserRecord> = raw ? JSON.parse(raw) : {};
    const now = Date.now();
    for (const k of Object.keys(map)) {
      if (now - (map[k]?.updatedAt || 0) > 45000) {
        delete map[k];
      }
    }
    map[keyId] = { ...presence, userId: keyId, sessionId: keyId, updatedAt: now };
    localStorage.setItem(LOCAL_PRESENCE_MAP_KEY, JSON.stringify(map));
  } catch {
    // ignore storage errors
  }

  try {
    if ('BroadcastChannel' in window) {
      const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      bc.postMessage({ type: 'PRESENCE_UPDATE', presence });
      bc.close();
    }
  } catch {
    // ignore
  }

  return readLocalPresenceList(keyId);
}

export function readLocalPresenceList(currentSessionId?: string): IslandOnlineUserRecord[] {
  const activeId = currentSessionId || getOrCreateIslandSessionId();
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_PRESENCE_MAP_KEY);
    if (!raw) return [];
    const map: Record<string, IslandOnlineUserRecord> = JSON.parse(raw);
    const now = Date.now();
    return Object.values(map)
      .filter((p) => p && now - (p.updatedAt || 0) <= 45000)
      .map((p) => ({
        ...p,
        userId: p.userId || p.sessionId || activeId,
        isCurrentSession: (p.userId || p.sessionId) === activeId,
      }));
  } catch {
    return [];
  }
}

export function subscribeLocalPresenceChanges(onUpdate: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  let bc: BroadcastChannel | null = null;
  try {
    if ('BroadcastChannel' in window) {
      bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      bc.onmessage = () => onUpdate();
    }
  } catch {
    bc = null;
  }
  const handleStorage = (e: StorageEvent) => {
    if (e.key === LOCAL_PRESENCE_MAP_KEY) onUpdate();
  };
  window.addEventListener('storage', handleStorage);
  return () => {
    window.removeEventListener('storage', handleStorage);
    if (bc) {
      try {
        bc.close();
      } catch {}
    }
  };
}

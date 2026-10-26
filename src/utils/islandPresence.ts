export type IslandBuildingId = 'home' | 'pain' | 'discussion' | 'creative' | 'arcade' | 'career';
export type IslandActivityType = 'browsing' | 'using';

export interface OnlineUserPresence {
  sessionId: string;
  userId?: string;
  userName: string;
  buildingId: IslandBuildingId;
  activity: IslandActivityType;
  updatedAt: number;
  isCurrentSession?: boolean;
}

export interface IslandAvatarAllocation {
  id: string;
  buildingId: IslandBuildingId;
  activity: IslandActivityType;
  label: string;
  isCurrentUser: boolean;
  slotIndex: number;
}

export interface BuildingOccupancyStat {
  buildingId: IslandBuildingId;
  browsingCount: number;
  usingCount: number;
  totalCount: number;
  percentage: number; // 0 ~ 100
  allocatedBrowsingAvatars: number;
  allocatedUsingAvatars: number;
}

export const ALL_BUILDING_IDS: IslandBuildingId[] = [
  'home',
  'pain',
  'discussion',
  'creative',
  'arcade',
  'career',
];

const SESSION_STORAGE_KEY = 'ideax_island_presence_session_id';
const LOCAL_PRESENCE_MAP_KEY = 'ideax_island_presence_local_map_v1';
const BROADCAST_CHANNEL_NAME = 'ideax_island_presence_channel';

export function getOrCreatePresenceSessionId(): string {
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

/**
 * 根據全體線上真人位置清單，計算：
 * 1. 每棟建築物的（瀏覽 + 使用中）佔全體線上人數的百分比 (%)
 * 2. 最多 25 個小人的配置清單（若線上 <= 25 人則 1:1 對應每個真人；若 > 25 人則依比例分配最多 25 個小人）
 */
export function computeIslandPresenceAllocation(
  rawOnlineUsers: OnlineUserPresence[],
  maxAvatars = 25,
): {
  totalOnline: number;
  buildingStats: Record<IslandBuildingId, BuildingOccupancyStat>;
  avatars: IslandAvatarAllocation[];
} {
  const totalOnline = rawOnlineUsers.length;

  const statsMap: Record<IslandBuildingId, BuildingOccupancyStat> = {
    home: {
      buildingId: 'home',
      browsingCount: 0,
      usingCount: 0,
      totalCount: 0,
      percentage: 0,
      allocatedBrowsingAvatars: 0,
      allocatedUsingAvatars: 0,
    },
    pain: {
      buildingId: 'pain',
      browsingCount: 0,
      usingCount: 0,
      totalCount: 0,
      percentage: 0,
      allocatedBrowsingAvatars: 0,
      allocatedUsingAvatars: 0,
    },
    discussion: {
      buildingId: 'discussion',
      browsingCount: 0,
      usingCount: 0,
      totalCount: 0,
      percentage: 0,
      allocatedBrowsingAvatars: 0,
      allocatedUsingAvatars: 0,
    },
    creative: {
      buildingId: 'creative',
      browsingCount: 0,
      usingCount: 0,
      totalCount: 0,
      percentage: 0,
      allocatedBrowsingAvatars: 0,
      allocatedUsingAvatars: 0,
    },
    arcade: {
      buildingId: 'arcade',
      browsingCount: 0,
      usingCount: 0,
      totalCount: 0,
      percentage: 0,
      allocatedBrowsingAvatars: 0,
      allocatedUsingAvatars: 0,
    },
    career: {
      buildingId: 'career',
      browsingCount: 0,
      usingCount: 0,
      totalCount: 0,
      percentage: 0,
      allocatedBrowsingAvatars: 0,
      allocatedUsingAvatars: 0,
    },
  };

  for (const u of rawOnlineUsers) {
    const bId = ALL_BUILDING_IDS.includes(u.buildingId) ? u.buildingId : 'home';
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
    const avatars: IslandAvatarAllocation[] = rawOnlineUsers.map((u, i) => {
      const bId = ALL_BUILDING_IDS.includes(u.buildingId) ? u.buildingId : 'home';
      const key = `${bId}_${u.activity}`;
      const slotIdx = slotCounters[key] || 0;
      slotCounters[key] = slotIdx + 1;

      if (u.activity === 'using') {
        statsMap[bId].allocatedUsingAvatars += 1;
      } else {
        statsMap[bId].allocatedBrowsingAvatars += 1;
      }

      return {
        id: u.sessionId || `avatar-${i}`,
        buildingId: bId,
        activity: u.activity,
        label: u.userName || '線上訪客',
        isCurrentUser: Boolean(u.isCurrentSession),
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
    sampleUsers: OnlineUserPresence[];
    allocated: number;
    remainder: number;
  };

  const buckets: Bucket[] = [];
  for (const bId of ALL_BUILDING_IDS) {
    for (const act of ['browsing', 'using'] as IslandActivityType[]) {
      const matching = rawOnlineUsers.filter(
        (u) => (ALL_BUILDING_IDS.includes(u.buildingId) ? u.buildingId : 'home') === bId && u.activity === act,
      );
      const count = matching.length;
      const exact = (count / totalOnline) * maxAvatars;
      const allocated = Math.floor(exact);
      buckets.push({
        buildingId: bId,
        activity: act,
        count,
        hasCurrentUser: matching.some((m) => m.isCurrentSession),
        sampleUsers: matching,
        allocated,
        remainder: exact - allocated,
      });
    }
  }

  // 確保當前用戶所在的群組至少有 1 個小人代表自己
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
      avatars.push({
        id: sample?.sessionId || `prop_${b.buildingId}_${b.activity}_${i}`,
        buildingId: b.buildingId,
        activity: b.activity,
        label: sample?.userName || '線上用戶',
        isCurrentUser: i === 0 && b.hasCurrentUser,
        slotIndex: i,
      });
    }
  }

  return { totalOnline, buildingStats: statsMap, avatars };
}

/**
 * 將本機跨分頁的即時位置寫入 localStorage 並廣播
 */
export function publishLocalPresence(presence: OnlineUserPresence): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(LOCAL_PRESENCE_MAP_KEY);
    const map: Record<string, OnlineUserPresence> = raw ? JSON.parse(raw) : {};
    const now = Date.now();
    // 清理超過 45 秒未更新的分頁
    for (const k of Object.keys(map)) {
      if (now - (map[k]?.updatedAt || 0) > 45000) {
        delete map[k];
      }
    }
    map[presence.sessionId] = { ...presence, updatedAt: now };
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
}

export function readLocalPresenceList(currentSessionId: string): OnlineUserPresence[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_PRESENCE_MAP_KEY);
    if (!raw) return [];
    const map: Record<string, OnlineUserPresence> = JSON.parse(raw);
    const now = Date.now();
    return Object.values(map)
      .filter((p) => p && now - (p.updatedAt || 0) <= 45000)
      .map((p) => ({
        ...p,
        isCurrentSession: p.sessionId === currentSessionId,
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

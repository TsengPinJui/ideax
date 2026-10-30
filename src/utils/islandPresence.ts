/**
 * 創點島 3D 即時線上真人位置、跨分頁同步與最多 50 位小人比例分配系統
 */

export type IslandBuildingId =
  | 'pain-innovation-tower'
  | 'discussion-library'
  | 'discussion-workshop'
  | 'discussion-street'
  | 'home-plaza'
  | 'home-map'
  | 'home-trade-street'
  | 'creative-exhibition'
  | 'creative-arcade'
  | 'career-academy'
  | 'career-temple';

export const ALL_ISLAND_BUILDING_IDS: IslandBuildingId[] = [
  'home-plaza',
  'home-map',
  'home-trade-street',
  'pain-innovation-tower',
  'discussion-library',
  'discussion-workshop',
  'discussion-street',
  'creative-exhibition',
  'creative-arcade',
  'career-academy',
  'career-temple',
];

export interface IslandOnlineUserRecord {
  userId: string;
  sessionId?: string;
  displayName?: string;
  buildingId: IslandBuildingId;
  activity: 'browsing' | 'using';
  updatedAt: number;
  isCurrentSession?: boolean;
}

export interface IslandAvatarAllocation {
  slotIndex: number;
  userId: string;
  displayName: string;
  buildingId: IslandBuildingId;
  activity: 'browsing' | 'using';
}

export interface IslandBuildingStats {
  buildingId: IslandBuildingId;
  browsingCount: number;
  usingCount: number;
  totalCount: number;
  percentage: number;
  allocatedAvatars: number;
}

const SESSION_STORAGE_KEY = 'ideax_island_session_id_v1';
const LOCAL_PRESENCE_STORAGE_KEY = 'ideax_island_local_presence_v1';
const PRESENCE_TTL_MS = 60_000;

let cachedSessionId: string | null = null;

export function getOrCreateIslandSessionId(): string {
  if (cachedSessionId) return cachedSessionId;
  if (typeof window === 'undefined') {
    cachedSessionId = `srv-${Math.random().toString(36).slice(2, 10)}`;
    return cachedSessionId;
  }
  try {
    const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (existing && existing.trim()) {
      cachedSessionId = existing.trim();
      return cachedSessionId;
    }
    const created = `isl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, created);
    cachedSessionId = created;
    return created;
  } catch {
    cachedSessionId = `mem-${Math.random().toString(36).slice(2, 10)}`;
    return cachedSessionId;
  }
}

export function readLocalPresenceList(): IslandOnlineUserRecord[] {
  if (typeof window === 'undefined') return [];
  const now = Date.now();
  try {
    const raw = window.localStorage.getItem(LOCAL_PRESENCE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item: any): item is IslandOnlineUserRecord =>
        Boolean(item) &&
        typeof item.buildingId === 'string' &&
        typeof item.updatedAt === 'number' &&
        now - item.updatedAt <= PRESENCE_TTL_MS
    );
  } catch {
    return [];
  }
}

export function publishLocalPresence(record: IslandOnlineUserRecord): IslandOnlineUserRecord[] {
  if (typeof window === 'undefined') return [record];
  const now = Date.now();
  const list = readLocalPresenceList();
  const key = record.sessionId || record.userId;
  const map = new Map<string, IslandOnlineUserRecord>();
  for (const item of list) {
    const k = item.sessionId || item.userId;
    if (k && now - item.updatedAt <= PRESENCE_TTL_MS) {
      map.set(k, item);
    }
  }
  map.set(key, { ...record, updatedAt: now });
  const updated = Array.from(map.values());
  try {
    window.localStorage.setItem(LOCAL_PRESENCE_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // 忽略配額或隱私模式限制
  }
  return updated;
}

export function subscribeLocalPresenceChanges(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: StorageEvent) => {
    if (!e.key || e.key === LOCAL_PRESENCE_STORAGE_KEY) {
      listener();
    }
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}

export function resolveIslandBuildingFromSelection(
  islandId?: string | null,
  districtId?: string | null,
  standId?: string | null
): IslandBuildingId {
  const combined = `${islandId || ''} ${districtId || ''} ${standId || ''}`.toLowerCase();
  if (combined.includes('pain')) return 'pain-innovation-tower';
  if (combined.includes('library') || combined.includes('academic')) return 'discussion-library';
  if (combined.includes('workshop') || combined.includes('pro')) return 'discussion-workshop';
  if (combined.includes('discussion')) return 'discussion-street';
  if (combined.includes('arcade') || combined.includes('game')) return 'creative-arcade';
  if (combined.includes('creative') || combined.includes('exhibition') || combined.includes('vibe')) {
    return 'creative-exhibition';
  }
  if (combined.includes('academy') || combined.includes('hanlin') || combined.includes('headhunter')) {
    return 'career-academy';
  }
  if (combined.includes('temple') || combined.includes('career') || combined.includes('job')) {
    return 'career-temple';
  }
  if (combined.includes('trade')) return 'home-trade-street';
  if (combined.includes('map')) return 'home-map';
  return 'home-plaza';
}

export function computeIslandPresenceAllocation(
  users: IslandOnlineUserRecord[],
  maxAvatars = 50
): {
  totalOnline: number;
  avatars: IslandAvatarAllocation[];
  buildingStats: Record<IslandBuildingId, IslandBuildingStats>;
} {
  const buildingStats = {} as Record<IslandBuildingId, IslandBuildingStats>;
  for (const bid of ALL_ISLAND_BUILDING_IDS) {
    buildingStats[bid] = {
      buildingId: bid,
      browsingCount: 0,
      usingCount: 0,
      totalCount: 0,
      percentage: 0,
      allocatedAvatars: 0,
    };
  }

  const validUsers = Array.isArray(users) && users.length > 0
    ? users
    : [
        {
          userId: getOrCreateIslandSessionId(),
          displayName: '線上訪客',
          buildingId: 'home-plaza' as IslandBuildingId,
          activity: 'browsing' as const,
          updatedAt: Date.now(),
        },
      ];

  for (const u of validUsers) {
    const bid: IslandBuildingId = ALL_ISLAND_BUILDING_IDS.includes(u.buildingId)
      ? u.buildingId
      : 'home-plaza';
    if (u.activity === 'using') {
      buildingStats[bid].usingCount += 1;
    } else {
      buildingStats[bid].browsingCount += 1;
    }
    buildingStats[bid].totalCount += 1;
  }

  const totalOnline = Math.max(1, validUsers.length);
  for (const bid of ALL_ISLAND_BUILDING_IDS) {
    buildingStats[bid].percentage = Math.round(
      (buildingStats[bid].totalCount / totalOnline) * 100
    );
  }

  const limit = Math.max(1, Math.min(maxAvatars, validUsers.length));
  const avatars: IslandAvatarAllocation[] = validUsers.slice(0, limit).map((u, idx) => {
    const bid: IslandBuildingId = ALL_ISLAND_BUILDING_IDS.includes(u.buildingId)
      ? u.buildingId
      : 'home-plaza';
    buildingStats[bid].allocatedAvatars += 1;
    return {
      slotIndex: idx,
      userId: u.userId || u.sessionId || `u-${idx}`,
      displayName: u.displayName || '線上訪客',
      buildingId: bid,
      activity: u.activity === 'using' ? 'using' : 'browsing',
    };
  });

  return {
    totalOnline,
    avatars,
    buildingStats,
  };
}

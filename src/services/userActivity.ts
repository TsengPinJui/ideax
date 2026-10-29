import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { auth, db } from './firebase';
import { getAuthHeaders } from './authHeader';
import type { User } from '../types';

/** 管理員後台：讀取所有會員的最近上線時間（存在 user_activity，具備伺服器 API 與雲端 Firestore 雙通道讀取備援） */
let cache: { at: number; map: Record<string, string> } | null = null;

async function fetchUserActivityMap(): Promise<Record<string, string>> {
  const merged: Record<string, string> = { ...(cache?.map || {}) };

  const mergeEntry = (id: string, ts: unknown) => {
    if (!id || typeof ts !== 'string' || !ts) return;
    const ms = Date.parse(ts);
    if (!Number.isFinite(ms)) return;
    const prevMs = merged[id] ? Date.parse(merged[id]) : 0;
    if (!prevMs || ms > prevMs) {
      merged[id] = ts;
    }
  };

  // 通道 1：透過後端管理員 API 讀取
  try {
    const r = await fetch('/api/admin/user-activity', { headers: await getAuthHeaders() });
    const j = await r.json().catch(() => null);
    if (j?.ok && j.activity && typeof j.activity === 'object') {
      for (const [id, ts] of Object.entries(j.activity)) {
        mergeEntry(id, ts);
      }
    }
  } catch {}

  // 通道 2：直接從 Firestore user_activity 集合讀取（當無需 Token 或 API 權限尚未就緒時自動補齊）
  try {
    const snap = await getDocs(collection(db, 'user_activity'));
    snap.docs.forEach((d) => {
      const data = d.data();
      mergeEntry(d.id, data?.lastActiveAt || data?.updatedAt);
    });
  } catch {}

  return merged;
}

export function useUserActivityMap(): Record<string, string> {
  const [map, setMap] = useState<Record<string, string>>(cache?.map || {});

  useEffect(() => {
    let alive = true;

    const load = async (force = false) => {
      if (!force && cache && Object.keys(cache.map).length > 0 && Date.now() - cache.at < 60 * 1000) {
        if (alive) setMap(cache.map);
        return;
      }
      const nextMap = await fetchUserActivityMap();
      if (Object.keys(nextMap).length > 0) {
        cache = { at: Date.now(), map: nextMap };
        if (alive) setMap(nextMap);
      }
    };

    void load();

    const unsubAuth = auth.onAuthStateChanged((u) => {
      if (u && (!cache || Object.keys(cache.map).length === 0)) {
        void load(true);
      }
    });

    return () => {
      alive = false;
      unsubAuth();
    };
  }, []);

  return map;
}

/**
 * 計算會員最準確的「最近上線時間」毫秒數：
 * 1. 優先比對 lastLoginAt、lastActiveAt、user_activity[u.id]、user_activity[u.authUid]
 * 2. 若為真實註冊會員且尚無 user_activity 紀錄（例如 v3.0.5 前註冊之會員），回退比對 updatedAt、agreedGeneralTermsAt、registeredAt、createdAt
 */
export function resolveUserLatestSeenMs(
  u: Partial<User> & Record<string, any>,
  userActivity: Record<string, string>
): number {
  if (!u) return 0;
  const primaryCandidates = [
    u.lastLoginAt,
    u.lastActiveAt,
    u.id ? userActivity[u.id] : undefined,
    u.authUid ? userActivity[u.authUid] : undefined,
  ];
  const primaryMs = primaryCandidates
    .filter(Boolean)
    .map((t) => new Date(t as string).getTime())
    .filter((n) => Number.isFinite(n) && n > 0);

  if (primaryMs.length > 0) {
    return Math.max(...primaryMs);
  }

  const idStr = String(u.id || '');
  const isSimulated = Boolean(u.isSimulated || idStr.startsWith('u-vc-') || idStr.startsWith('user-'));
  if (isSimulated) return 0;

  const fallbackCandidates = [
    u.agreedGeneralTermsAt,
    u.registeredAt,
    u.createdAt,
    u.updatedAt && !String(u.updatedAt).startsWith('2026-10-18T12:52:27') ? u.updatedAt : undefined,
    u.updatedAt,
  ];
  const fallbackMs = fallbackCandidates
    .filter(Boolean)
    .map((t) => new Date(t as string).getTime())
    .filter((n) => Number.isFinite(n) && n > 0);

  return fallbackMs.length > 0 ? Math.max(...fallbackMs) : 0;
}

import { useEffect, useState } from 'react';
import { getAuthHeaders } from './authHeader';

/** 管理員後台：讀一次所有會員的最近上線時間（存在 user_activity，不在會員資料裡） */
let cache: { at: number; map: Record<string, string> } | null = null;

export function useUserActivityMap(): Record<string, string> {
  const [map, setMap] = useState<Record<string, string>>(cache?.map || {});
  useEffect(() => {
    if (cache && Date.now() - cache.at < 60 * 1000) return;
    let alive = true;
    (async () => {
      try {
        const r = await fetch('/api/admin/user-activity', { headers: await getAuthHeaders() });
        const j = await r.json().catch(() => null);
        if (j?.ok && j.activity) {
          cache = { at: Date.now(), map: j.activity };
          if (alive) setMap(j.activity);
        }
      } catch {}
    })();
    return () => { alive = false; };
  }, []);
  return map;
}

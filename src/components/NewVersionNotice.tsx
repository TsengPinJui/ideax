import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { APP_VERSION } from '../data/versionData';

/**
 * 有新版本時提醒更新：
 * 手機加到主畫面的 APP、或一直開著的分頁，切回來時還是舊程式，不會自己換新版。
 * 每次切回來、以及每 15 分鐘問一次伺服器目前的版本；
 * 離開超過 5 分鐘才回來就直接重新整理，其他時候在下方顯示「點一下更新」，不打斷正在做的事。
 */
const CHECK_EVERY_MS = 15 * 60 * 1000;
const AUTO_RELOAD_AFTER_HIDDEN_MS = 5 * 60 * 1000;

async function fetchServerVersion(): Promise<string | null> {
  try {
    const r = await fetch('/api/version', { cache: 'no-store' });
    if (!r.ok) return null;
    const j = await r.json();
    return typeof j?.version === 'string' ? j.version : null;
  } catch {
    return null;
  }
}

export const NewVersionNotice: React.FC = () => {
  const [newVersion, setNewVersion] = useState<string | null>(null);
  const hiddenAt = useRef<number>(0);

  useEffect(() => {
    let stopped = false;
    const check = async (autoReload: boolean) => {
      const v = await fetchServerVersion();
      if (stopped || !v || v === APP_VERSION) return;
      if (autoReload) { window.location.reload(); return; }
      setNewVersion(v);
    };
    const onVisible = () => {
      if (document.visibilityState === 'hidden') { hiddenAt.current = Date.now(); return; }
      const away = hiddenAt.current ? Date.now() - hiddenAt.current : 0;
      void check(away >= AUTO_RELOAD_AFTER_HIDDEN_MS);
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', (e) => { if ((e as PageTransitionEvent).persisted) void check(false); });
    const timer = window.setInterval(() => void check(false), CHECK_EVERY_MS);
    const first = window.setTimeout(() => void check(false), 20000);
    return () => {
      stopped = true;
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(timer);
      window.clearTimeout(first);
    };
  }, []);

  if (!newVersion) return null;
  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-24 sm:bottom-6 z-[400] animate-in fade-in slide-in-from-bottom-2 duration-200" role="status">
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="flex items-center gap-2 rounded-full bg-stone-900 text-white px-4 py-2.5 text-xs font-bold shadow-xl hover:bg-stone-800 cursor-pointer"
      >
        <RefreshCw className="w-4 h-4 text-amber-300" />
        <span>IdeaX 有新版本 v{newVersion}，點一下更新</span>
      </button>
    </div>
  );
};

export default NewVersionNotice;

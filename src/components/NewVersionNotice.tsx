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
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let stopped = false;
    const check = async () => {
      const v = await fetchServerVersion();
      if (stopped || !v || v === APP_VERSION) return;
      setNewVersion(v);
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void check();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', (e) => { if ((e as PageTransitionEvent).persisted) void check(); });
    const timer = window.setInterval(() => void check(), CHECK_EVERY_MS);
    const first = window.setTimeout(() => void check(), 20000);
    return () => {
      stopped = true;
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(timer);
      window.clearTimeout(first);
    };
  }, []);

  if (!newVersion || dismissed) return null;
  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-24 sm:bottom-6 z-[400] animate-in fade-in slide-in-from-bottom-2 duration-200 flex items-center gap-1 shadow-2xl rounded-full bg-stone-900 border border-stone-800 p-1 pl-4" role="status">
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="flex items-center gap-2 text-white pr-2 py-1 text-xs font-bold hover:text-amber-300 cursor-pointer transition-colors"
      >
        <RefreshCw className="w-3.5 h-3.5 text-amber-300 animate-spin" style={{ animationDuration: '4s' }} />
        <span>IdeaX 有新版本 v{newVersion}，點此更新</span>
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="p-1 text-stone-400 hover:text-white rounded-full hover:bg-stone-800 transition-colors"
        title="稍後更新"
        aria-label="稍後更新"
      >
        <span className="text-xs px-1 font-bold">✕</span>
      </button>
    </div>
  );
};

export default NewVersionNotice;

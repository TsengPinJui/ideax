import React, { useEffect, useState } from 'react';
import { X, Share } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { triggerDirectAppDownloadOrInstall } from '../../services/pwaInstaller';

/**
 * 匯職缺：把網站加入主畫面／安裝的提示
 * - 瀏覽器支援直接安裝（Chrome、Edge、Android）：直接出現「安裝」鍵，按下去跳出瀏覽器的安裝視窗
 * - iPhone／iPad Safari 不能用程式安裝：寫出步驟（分享 → 加入主畫面），另有「看教學」
 * - 其他瀏覽器：「加入主畫面」打開安裝教學
 * 已經用 App 開啟、已安裝，或關掉後 14 天內都不再出現
 */
const DISMISS_KEY = 'ideax_jobs_install_dismissed_until';

const isAppMode = () => {
  try {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      (window.navigator as any).standalone === true ||
      sessionStorage.getItem('ideax_is_app') === 'true' ||
      localStorage.getItem('ideax_pwa_installed') === 'true'
    );
  } catch {
    return false;
  }
};

const isIosSafari = () => {
  const ua = navigator.userAgent || '';
  const ios = /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  return ios && /safari/i.test(ua) && !/crios|fxios|edgios|line\/|fban|fbav|instagram/i.test(ua);
};

export const JobsInstallPrompt: React.FC = () => {
  const { openPwaInstallModal } = useApp();
  const [hidden, setHidden] = useState(() => {
    if (isAppMode()) return true;
    try { return Number(localStorage.getItem(DISMISS_KEY) || 0) > Date.now(); } catch { return false; }
  });
  const [canPrompt, setCanPrompt] = useState(() => Boolean((window as any).deferredPwaPrompt));
  const ios = isIosSafari();

  useEffect(() => {
    const ready = () => setCanPrompt(Boolean((window as any).deferredPwaPrompt));
    const installed = () => setHidden(true);
    window.addEventListener('pwa-prompt-ready', ready);
    window.addEventListener('beforeinstallprompt', ready);
    window.addEventListener('appinstalled', installed);
    return () => {
      window.removeEventListener('pwa-prompt-ready', ready);
      window.removeEventListener('beforeinstallprompt', ready);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);

  if (hidden) return null;

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now() + 14 * 86400000)); } catch {}
    setHidden(true);
  };
  const install = async () => {
    const r = await triggerDirectAppDownloadOrInstall(openPwaInstallModal);
    if (r === 'installed') setHidden(true);
    else setCanPrompt(Boolean((window as any).deferredPwaPrompt));
  };

  return (
    <div className="relative flex items-center gap-3 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-white px-3 py-2.5 sm:px-4 shadow-2xs" role="region" aria-label="把匯職缺加入主畫面">
      <img src="/logo-bulb.png" alt="" className="w-9 h-9 sm:w-10 sm:h-10 object-contain shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-xs sm:text-sm font-black text-stone-900">把匯職缺加到主畫面</p>
        {ios && !canPrompt ? (
          <p className="text-[11px] text-stone-600 leading-snug mt-0.5">
            點 Safari 的 <Share className="inline w-3.5 h-3.5 -mt-0.5 text-sky-600" aria-label="分享" /> 分享，再選「加入主畫面」，下次找工作一點就開
          </p>
        ) : (
          <p className="text-[11px] text-stone-600 leading-snug mt-0.5">下次找工作一點就開，像 App 一樣全螢幕使用</p>
        )}
      </div>
      {canPrompt ? (
        <button type="button" onClick={install} className="shrink-0 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black shadow-xs cursor-pointer active:scale-95">
          安裝
        </button>
      ) : (
        <button type="button" onClick={install} className="shrink-0 px-3 py-2 rounded-xl border border-amber-300 bg-white hover:bg-amber-50 text-amber-800 text-xs font-black cursor-pointer">
          {ios ? '看教學' : '加入主畫面'}
        </button>
      )}
      <button type="button" onClick={dismiss} aria-label="不要再提示" title="14 天內不再提示" className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white border border-stone-200 text-stone-400 hover:text-stone-700 flex items-center justify-center shadow-xs cursor-pointer">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export default JobsInstallPrompt;

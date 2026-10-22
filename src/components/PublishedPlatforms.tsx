import React, { useState } from 'react';
import { Globe, Smartphone, Gamepad2, Monitor, Puzzle, Store, X, Plus, Check, ExternalLink } from 'lucide-react';
import type { PublishedPlatform } from '../types';

/**
 * Vibecoding 作品「已上架平台」：發文／更新時可複選（選填）、也能自填其他平台，每個平台後面可以填網址；
 * 前台顯示成小標籤，有網址的可以直接點過去。
 */
export const PLATFORM_PRESETS = [
  '網頁瀏覽器',
  'PWA',
  'Google Play',
  'App Store',
  'Steam',
  'Microsoft Store',
  'Mac App Store',
  'Chrome 擴充功能',
  'LINE Mini App',
  'itch.io',
  'Nintendo eShop',
] as const;

const MAX_PLATFORMS = 12;
const MAX_LEN = 24;
const MAX_URL = 500;

/** 只接受 http(s) 網址，其他（javascript: 等）一律不當連結 */
export function safePlatformUrl(u: unknown): string | undefined {
  const s = typeof u === 'string' ? u.trim().slice(0, MAX_URL) : '';
  if (!s) return undefined;
  try {
    const url = new URL(s);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

/** 整理成乾淨的清單：去空白、去重複、限制數量與長度；網址只留合法的 http(s) */
export function normalizePlatforms(list: unknown, keepDraftUrl = false): PublishedPlatform[] {
  if (!Array.isArray(list)) return [];
  const out: PublishedPlatform[] = [];
  for (const v of list) {
    const raw = typeof v === 'string' ? { name: v } : v && typeof v === 'object' ? (v as any) : null;
    const name = typeof raw?.name === 'string' ? raw.name.trim().slice(0, MAX_LEN) : '';
    if (!name || out.some((x) => x.name.toLowerCase() === name.toLowerCase())) continue;
    const url = keepDraftUrl ? (typeof raw.url === 'string' ? raw.url.slice(0, MAX_URL) : '') : safePlatformUrl(raw.url);
    out.push(url ? { name, url } : { name });
    if (out.length >= MAX_PLATFORMS) break;
  }
  return out;
}

const iconFor = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('pwa')) return Smartphone;
  if (n.includes('網頁') || n.includes('web') || n.includes('瀏覽器')) return Globe;
  if (n.includes('steam') || n.includes('itch') || n.includes('nintendo') || n.includes('playstation') || n.includes('xbox') || n.includes('eshop')) return Gamepad2;
  if (n.includes('擴充') || n.includes('extension') || n.includes('外掛')) return Puzzle;
  if (n.includes('microsoft') || n.includes('mac') || n.includes('windows') || n.includes('桌面')) return Monitor;
  if (n.includes('play') || n.includes('app store') || n.includes('line') || n.includes('ios') || n.includes('android')) return Smartphone;
  return Store;
};

const URL_HINT: Record<string, string> = {
  '網頁瀏覽器': 'https://你的網站.com',
  'PWA': 'https://你的網站.com',
  'Google Play': 'https://play.google.com/store/apps/details?id=…',
  'App Store': 'https://apps.apple.com/app/…',
  Steam: 'https://store.steampowered.com/app/…',
};

export const PublishedPlatformsPicker: React.FC<{ value: PublishedPlatform[]; onChange: (v: PublishedPlatform[]) => void }> = ({ value, onChange }) => {
  const [custom, setCustom] = useState('');
  const idx = (p: string) => value.findIndex((x) => x.name.toLowerCase() === p.toLowerCase());
  const toggle = (p: string) => {
    const i = idx(p);
    onChange(i >= 0 ? value.filter((_, j) => j !== i) : normalizePlatforms([...value, { name: p }], true));
  };
  const setUrl = (i: number, url: string) => onChange(value.map((x, j) => (j === i ? { ...x, url } : x)));
  const addCustom = () => {
    // 可以一次輸入多個，用逗號或頓號隔開
    const parts = custom.split(/[,，、]/).map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return;
    onChange(normalizePlatforms([...value, ...parts.map((name) => ({ name }))], true));
    setCustom('');
  };
  const full = value.length >= MAX_PLATFORMS;

  return (
    <div>
      <label className="block text-xs font-bold text-stone-800 mb-1 flex items-center gap-1.5 flex-wrap">
        <Store className="w-3.5 h-3.5 text-purple-600" />
        <span>已上架平台</span>
        <span className="text-[10px] font-semibold text-stone-500">（選填，可複選；勾選後可在後面填入網址）</span>
      </label>
      <div className="flex flex-wrap gap-1.5">
        {PLATFORM_PRESETS.map((p) => {
          const on = idx(p) >= 0;
          const Icon = iconFor(p);
          return (
            <button
              key={p}
              type="button"
              aria-pressed={on}
              disabled={!on && full}
              onClick={() => toggle(p)}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                on ? 'border-purple-500 bg-purple-600 text-white' : 'border-purple-200 bg-white text-stone-700 hover:border-purple-400 hover:bg-purple-50'
              }`}
            >
              {on ? <Check className="w-3 h-3" /> : <Icon className="w-3 h-3 text-purple-500" />}
              {p}
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex gap-1.5">
        <input
          type="text"
          value={custom}
          maxLength={60}
          disabled={full}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
          placeholder="其他平台自填，例如：Huawei AppGallery、Product Hunt"
          className="flex-1 min-w-0 px-3 py-1.5 rounded-xl border border-purple-200 focus:border-purple-500 text-xs text-stone-900 outline-none bg-white disabled:bg-stone-50"
        />
        <button
          type="button"
          onClick={addCustom}
          disabled={full || !custom.trim()}
          className="shrink-0 inline-flex items-center gap-1 rounded-xl border border-purple-300 bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-700 hover:bg-purple-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />加入
        </button>
      </div>

      {value.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {value.map((p, i) => {
            const Icon = iconFor(p.name);
            const bad = !!p.url?.trim() && !safePlatformUrl(p.url);
            return (
              <li key={p.name} className="flex items-center gap-1.5">
                <span className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-purple-600 px-2 py-1 text-[11px] font-bold text-white max-w-[42%] sm:max-w-[11rem]">
                  <Icon className="w-3 h-3 shrink-0" />
                  <span className="truncate">{p.name}</span>
                </span>
                <input
                  type="url"
                  inputMode="url"
                  value={p.url || ''}
                  maxLength={MAX_URL}
                  onChange={(e) => setUrl(i, e.target.value)}
                  placeholder={`網址（選填）${URL_HINT[p.name] ? `，例如 ${URL_HINT[p.name]}` : ''}`}
                  aria-label={`${p.name} 的網址`}
                  aria-invalid={bad}
                  className={`flex-1 min-w-0 px-2.5 py-1 rounded-lg border text-[11px] font-mono text-stone-900 outline-none bg-white ${bad ? 'border-rose-400 focus:border-rose-500' : 'border-purple-200 focus:border-purple-500'}`}
                />
                <button type="button" onClick={() => toggle(p.name)} aria-label={`移除 ${p.name}`} className="shrink-0 rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700 cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              </li>
            );
          })}
          {value.some((p) => !!p.url?.trim() && !safePlatformUrl(p.url)) && (
            <li className="text-[10px] font-semibold text-rose-600">網址要以 https:// 開頭，格式不對的網址不會顯示成連結。</li>
          )}
        </ul>
      )}
    </div>
  );
};

/** 前台顯示：已上架平台小標籤（有網址的可以點） */
export const PublishedPlatformsBadges: React.FC<{ platforms?: PublishedPlatform[] | string[]; size?: 'sm' | 'md'; max?: number; linkable?: boolean; className?: string }> = ({
  platforms, size = 'md', max, linkable = true, className = '',
}) => {
  const list = normalizePlatforms(platforms);
  if (!list.length) return null;
  const shown = max ? list.slice(0, max) : list;
  const rest = list.length - shown.length;
  const chip = size === 'sm' ? 'px-1.5 py-0.5 text-[10px] gap-0.5' : 'px-2 py-0.5 text-[11px] gap-1';
  const ic = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3';
  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`} aria-label={`已上架平台：${list.map((p) => p.name).join('、')}`}>
      {shown.map((p) => {
        const Icon = iconFor(p.name);
        const inner = (
          <>
            <Icon className={`${ic} text-purple-500 shrink-0`} />
            {p.name}
            {linkable && p.url && <ExternalLink className={`${ic} text-purple-400 shrink-0`} />}
          </>
        );
        return linkable && p.url ? (
          <a
            key={p.name}
            href={p.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            onClick={(e) => e.stopPropagation()}
            className={`inline-flex items-center rounded-full border border-purple-300 bg-purple-50 font-bold text-purple-800 hover:bg-purple-100 hover:border-purple-400 transition-colors ${chip}`}
          >
            {inner}
          </a>
        ) : (
          <span key={p.name} className={`inline-flex items-center rounded-full border border-purple-200 bg-purple-50 font-bold text-purple-800 ${chip}`}>
            {inner}
          </span>
        );
      })}
      {rest > 0 && <span className={`inline-flex items-center rounded-full border border-stone-200 bg-white font-bold text-stone-500 ${chip}`}>+{rest}</span>}
    </div>
  );
};

/** 詳情頁用：「已上架平台」區塊 */
export const PublishedPlatformsBlock: React.FC<{ platforms?: PublishedPlatform[] | string[]; className?: string }> = ({ platforms, className = '' }) => {
  if (!normalizePlatforms(platforms).length) return null;
  return (
    <div className={`p-3 rounded-xl bg-white border border-purple-200 text-xs space-y-1.5 ${className}`}>
      <div className="font-extrabold text-purple-900 flex items-center gap-1.5">
        <Store className="w-3.5 h-3.5 text-purple-600" />
        <span>已上架平台</span>
      </div>
      <PublishedPlatformsBadges platforms={platforms} />
    </div>
  );
};

/** 作者有填網址的平台（給「外部連結」選擇視窗用） */
export function platformLinksOf(platforms?: PublishedPlatform[] | string[]): PublishedPlatform[] {
  return normalizePlatforms(platforms).filter((p) => !!p.url);
}

const hostOf = (u: string) => { try { return new URL(u).host.replace(/^www\./, ''); } catch { return u; } };

/** 選擇視窗裡的選項：作者填了網址的平台；作品網址不在其中時另列「作品網站」 */
function chooserOptions(it: { demoUrl?: string; platforms?: PublishedPlatform[] | string[] }): PublishedPlatform[] {
  const links = platformLinksOf(it.platforms);
  const demo = safePlatformUrl(it.demoUrl);
  return demo && !links.some((p) => p.url === demo) ? [{ name: '作品網站', url: demo }, ...links] : links;
}

export type PlatformChooserItem = { title?: string; demoUrl?: string; platforms?: PublishedPlatform[] | string[] };

/**
 * 點「外部連結」時先跳出作者填的各平台連結，讓觀眾選要進哪一個；
 * 作者沒有填任何平台網址時，就照原本直接打開作品網址。
 */
export function usePlatformLinkChooser() {
  const [item, setItem] = React.useState<PlatformChooserItem | null>(null);
  /** 掛在外部連結 <a> 的 onClick：有平台網址就攔下來改開選擇視窗 */
  const onLinkClick = (e: React.MouseEvent, it: PlatformChooserItem) => {
    e.stopPropagation();
    const opts = chooserOptions(it);
    if (opts.length <= 1) {
      // 只有一個地方可去：直接打開那一個
      if (opts.length === 1 && (e.currentTarget as HTMLAnchorElement).href !== opts[0].url) { e.preventDefault(); window.open(opts[0].url, '_blank', 'noopener,noreferrer'); }
      return;
    }
    e.preventDefault();
    setItem(it);
  };
  /** 要不要顯示外部連結按鈕、按鈕的備用網址 */
  const linkFor = (it: PlatformChooserItem) => safePlatformUrl(it.demoUrl) || it.demoUrl || platformLinksOf(it.platforms)[0]?.url || '';
  const chooser = item ? <PlatformLinkChooser item={item} onClose={() => setItem(null)} /> : null;
  return { onLinkClick, linkFor, chooser };
}

export const PlatformLinkChooser: React.FC<{ item: PlatformChooserItem; onClose: () => void }> = ({ item, onClose }) => {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const options = chooserOptions(item);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="選擇要前往的平台"
      onClick={(e) => { e.stopPropagation(); onClose(); }}
      className="fixed inset-0 z-[320] flex items-end sm:items-center justify-center bg-stone-950/55 p-0 sm:p-4 backdrop-blur-[2px] animate-in fade-in duration-150"
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl p-5 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-black text-stone-900">要去哪個平台？</h3>
            {item.title && <p className="mt-0.5 text-xs text-stone-500 truncate">{item.title}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="關閉" className="shrink-0 rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <ul className="mt-4 space-y-2">
          {options.map((p) => {
            const Icon = iconFor(p.name);
            return (
              <li key={p.name + p.url}>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  onClick={() => window.setTimeout(onClose, 50)}
                  className="flex items-center gap-3 rounded-2xl border border-purple-200 bg-purple-50/50 px-3.5 py-3 hover:bg-purple-100 hover:border-purple-400 transition-colors"
                >
                  <span className="shrink-0 w-9 h-9 rounded-xl bg-white border border-purple-200 flex items-center justify-center">
                    <Icon className="w-4.5 h-4.5 text-purple-600" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-black text-stone-900 truncate">{p.name}</span>
                    <span className="block text-[11px] font-mono text-stone-500 truncate">{hostOf(p.url!)}</span>
                  </span>
                  <ExternalLink className="w-4 h-4 text-purple-500 shrink-0" />
                </a>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-[10px] text-stone-400">連結由作者提供，會在新分頁開啟。</p>
      </div>
    </div>
  );
};

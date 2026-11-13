import React from 'react';
import { Languages } from 'lucide-react';
import { getSiteLang, setSiteLang, SiteLang } from '../utils/siteLanguage';

const OPTIONS: Array<[SiteLang, string]> = [
  ['zh-TW', '繁體中文'],
  ['zh-CN', '简体中文'],
];

/** 繁／簡切換。選項文字固定顯示原文（data-no-convert），切換後重新載入套用。 */
export const LanguageSwitcher: React.FC<{ variant?: 'dark' | 'light'; className?: string }> = ({ variant = 'light', className = '' }) => {
  const current = getSiteLang();
  const dark = variant === 'dark';
  return (
    <div data-no-convert className={`inline-flex items-center gap-1 ${className}`}>
      <Languages className={`w-3.5 h-3.5 ${dark ? 'text-stone-500' : 'text-stone-400'}`} aria-hidden />
      <div role="radiogroup" aria-label="顯示語言 / 显示语言" className={`inline-flex rounded-lg p-0.5 ${dark ? 'bg-stone-800/70' : 'bg-stone-100'}`}>
        {OPTIONS.map(([lang, label]) => {
          const active = current === lang;
          return (
            <button
              key={lang}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => { if (!active) setSiteLang(lang); }}
              className={`px-2 h-6 rounded-md text-[11px] whitespace-nowrap transition-colors cursor-pointer ${
                active
                  ? dark ? 'bg-stone-600 text-white font-semibold' : 'bg-white text-stone-900 font-semibold shadow-sm'
                  : dark ? 'text-stone-400 hover:text-stone-200' : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

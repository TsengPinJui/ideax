import React from 'react';
import {
  Headphones,
  Mail,
  Clock,
  FileText,
  Info,
  Download,
} from 'lucide-react';
import { IdeaXLogo } from './IdeaXLogo';
import { AppTab, AboutSection } from '../types';
import { useApp } from '../context/AppContext';
import { triggerDirectAppDownloadOrInstall } from '../services/pwaInstaller';

interface FooterProps {
  onNavClick: (tab: AppTab, section?: AboutSection | string) => void;
  onPostClick: () => void;
  onSearchTag?: (tag: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavClick, onPostClick, onSearchTag }) => {
  const { openCustomerService, openPwaInstallModal } = useApp();

  const handleTagClick = (tagWithHash: string) => {
    const rawTag = tagWithHash.replace('#', '').trim();
    if (onSearchTag) {
      onSearchTag(rawTag);
    }
    onNavClick('explore');
    setTimeout(() => {
      const el = document.getElementById('market-grid');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 60);
  };

  return (
    <footer className="bg-stone-950 text-stone-300 border-t border-stone-800 pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 pb-10 border-b border-stone-800 text-xs">
          {/* Brand info - 頁尾 IdeaX 左側去背燈泡 + IdeaX 品牌識別 */}
          <div className="space-y-3.5 sm:col-span-2 lg:col-span-1">
            <button
              type="button"
              onClick={() => onNavClick('explore')}
              title="回到首頁"
              className="inline-flex items-center gap-2.5 py-1 hover:opacity-90 transition-opacity text-left cursor-pointer focus:outline-none group"
            >
              <div className="w-10 h-10 sm:w-11 sm:h-11 shrink-0 flex items-center justify-center">
                <img
                  src="/logo-topleft-3.png"
                  alt="創點子燈泡"
                  className="w-full h-full object-contain drop-shadow-xs group-hover:scale-105 transition-transform"
                />
              </div>
              <IdeaXLogo variant="ideax-6" size="sm" theme="dark" />
            </button>
            <p className="text-stone-400 leading-relaxed pt-1">
              一個問題，找到更多可能。專為新創團隊、商業領袖與技術探索者打造的高價值問題與解決方案交易市場。讓想法發光，連結無限可能。
            </p>
          </div>

          {/* Quick links: 平台導覽 */}
          <div className="space-y-3">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">平台導覽</h4>
            <ul className="space-y-2 text-stone-400">
              <li>
                <button
                  onClick={() => onNavClick('explore')}
                  className="hover:text-amber-400 transition-colors cursor-pointer text-left"
                >
                  探索問題
                </button>
              </li>
              <li>
                <button
                  onClick={onPostClick}
                  className="hover:text-amber-400 transition-colors text-left cursor-pointer"
                >
                  發布問題
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavClick('solvers')}
                  className="hover:text-amber-400 transition-colors cursor-pointer text-left"
                >
                  認證專家
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavClick('leaderboard')}
                  className="hover:text-amber-400 transition-colors cursor-pointer text-left"
                >
                  交易榮譽榜
                </button>
              </li>
            </ul>
          </div>

          {/* 關於與支援：關於我們、條款與聲明、客服服務、聯繫我們（移至平台導覽右側） */}
          <div className="space-y-3">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">關於與支援</h4>
            <ul className="space-y-2 text-stone-400">
              <li>
                <button
                  onClick={() => onNavClick('about', 'story')}
                  className="hover:text-amber-300 transition-colors text-left font-bold text-amber-400 cursor-pointer flex items-center gap-1.5"
                >
                  <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>關於我們</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavClick('about', 'terms')}
                  className="hover:text-amber-300 transition-colors text-left font-bold text-amber-400 cursor-pointer flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>條款與聲明</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => openCustomerService({ subject: '平台一般客服諮詢與支援' })}
                  className="hover:text-amber-300 transition-colors text-left font-bold text-amber-400 cursor-pointer flex items-center gap-1.5"
                >
                  <Headphones className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>客服服務</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => triggerDirectAppDownloadOrInstall(openPwaInstallModal)}
                  className="hover:text-amber-300 transition-colors text-left font-bold text-amber-400 cursor-pointer flex items-center gap-1.5 active:scale-95"
                  title="直接下載或安裝 IdeaX 行動與桌面版 App"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-bounce" />
                  <span>下載 APP</span>
                </button>
              </li>
            </ul>

            {/* 聯繫我們：（預留mail和聯繫方式） */}
            <div className="pt-2 border-t border-stone-800/80 space-y-1.5 text-stone-400 text-[11px]">
              <span className="font-bold text-stone-300 block">聯繫我們：</span>
              <div className="flex items-center gap-1.5 text-stone-400">
                <Mail className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <a
                  href="mailto:support@ideax.tw"
                  className="hover:text-amber-400 transition-colors underline font-mono"
                >
                  support@ideax.tw
                </a>
              </div>
              <div className="flex items-center gap-1.5 text-stone-400">
                <Clock className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                <span>週一至週五 09:30 ~ 18:30</span>
              </div>
            </div>
          </div>

          {/* Categories / Hashtags: 點擊直接搜尋題目分類 */}
          <div className="space-y-2.5 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">熱門題目分類標籤</h4>
              <span className="text-[10px] text-amber-500 font-semibold">點擊直接搜尋</span>
            </div>
            <div className="flex flex-wrap gap-1.5 text-stone-300">
              {[
                '#商業模式',
                '#AI應用',
                '#創業痛點',
                '#行銷增長',
                '#系統架構',
                '#股權募資',
                '#合約法律',
                '#產品設計',
                '#職場顧問',
                '#生醫科技',
                '#生活疑難',
                '#跨境電商',
              ].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleTagClick(tag)}
                  className="px-2.5 py-1 bg-stone-900 hover:bg-amber-500 hover:text-stone-950 text-amber-300 border border-stone-800 hover:border-amber-400 rounded-lg font-bold text-[11px] transition-all cursor-pointer active:scale-95 shadow-2xs group flex items-center gap-1"
                  title={`點擊立即搜尋「${tag}」相關題目`}
                >
                  <span className="text-amber-500 group-hover:text-stone-950">#</span>
                  <span>{tag.replace('#', '')}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-stone-500">
          <div className="flex items-center gap-2 flex-wrap">
            <span>© {new Date().getFullYear()} 創點子 IdeaX. All rights reserved.</span>
            <span>•</span>
            <button
              onClick={() => onNavClick('about', 'story')}
              className="text-amber-400 hover:text-amber-300 font-bold underline transition-colors cursor-pointer"
            >
              關於我們
            </button>
            <span>•</span>
            <button
              onClick={() => onNavClick('about', 'terms')}
              className="text-amber-400 hover:text-amber-300 font-bold underline transition-colors cursor-pointer"
            >
              條款與聲明
            </button>
            <span>•</span>
            <button
              onClick={() => openCustomerService({ subject: '頁尾客服諮詢與支援' })}
              className="text-amber-400 hover:text-amber-300 font-bold underline transition-colors cursor-pointer"
            >
              客服服務
            </button>
            <span>•</span>
            <span>讓創新想法化為真實商業價值。</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap text-stone-400 font-mono text-[10px]">
            <span className="px-2 py-0.5 rounded-md bg-stone-900 border border-stone-800 text-amber-400 font-bold tracking-tight shadow-2xs">
              v1.2.1 • Build 2026.09.29
            </span>
            <span className="text-stone-600 font-sans">Powered by AI Engine</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

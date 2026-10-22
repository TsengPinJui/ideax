import React, { useState } from 'react';
import {
  Headphones,
  Mail,
  Clock,
  FileText,
  Info,
  Download,
  Compass,
  Layers,
  Lightbulb,
  Sparkles,
  Users,
} from 'lucide-react';
import { IdeaXLogo } from './IdeaXLogo';
import { AppTab, AboutSection } from '../types';
import { useApp } from '../context/AppContext';
import { triggerDirectAppDownloadOrInstall } from '../services/pwaInstaller';
import { APP_VERSION, APP_RELEASE_DATE } from '../data/versionData';
import { PointsGuideModal } from './PointsGuideModal';

interface FooterProps {
  onNavClick: (tab: AppTab, section?: AboutSection | string) => void;
  onPostClick: () => void;
  onSearchTag?: (tag: string) => void;
  onStartOnboarding?: () => void;
}

/** 真正的 <a href> 連結（Google 靠它發現各分頁），一般點擊仍用站內切換不重新載入 */
const spaClick = (action: () => void) => (e: React.MouseEvent<HTMLAnchorElement>) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  action();
};

export const Footer: React.FC<FooterProps> = ({ onNavClick, onPostClick, onSearchTag, onStartOnboarding }) => {
  const { openCustomerService, openPwaInstallModal, isDemoMode, isNoPaymentMode, isHideTestAccounts, isRaceMode, currentUser } = useApp();
  const [isPointsGuideOpen, setIsPointsGuideOpen] = useState(false);

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
    <footer className="block bg-stone-950 text-stone-300 border-t border-stone-800/80 pt-8 sm:pt-10 pb-24 lg:pb-8">
      <PointsGuideModal isOpen={isPointsGuideOpen} onClose={() => setIsPointsGuideOpen(false)} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 pb-8 border-b border-stone-800/70 text-xs">
          {/* Brand info */}
          <div className="col-span-2 lg:col-span-1 space-y-2.5">
            <button
              type="button"
              onClick={() => {
                onNavClick('explore');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              title="回到首頁頂部"
              className="inline-flex items-center gap-1 py-0.5 hover:opacity-95 transition-all text-left cursor-pointer focus:outline-none group"
            >
              <div className="w-[46px] h-[46px] sm:w-[54px] sm:h-[54px] shrink-0 flex items-center justify-center">
                <IdeaXLogo variant="bulb" size="lg" className="group-hover:scale-105 transition-transform duration-200" />
              </div>
              <img
                src="/logo-6-trans-dark.png"
                alt="IdeaX"
                className="h-5 sm:h-6 md:h-7 w-auto object-contain shrink-0"
              />
            </button>
            <p className="text-stone-400 leading-relaxed text-[11px] sm:text-xs max-w-xs">
              一個問題，找到更多可能。讓真實痛點連結落地解決方案。
            </p>
          </div>

          {/* Quick links: 平台導覽 */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-stone-200 tracking-wider text-[11px]">平台導覽</h4>
            <ul className="space-y-1.5 text-stone-400">
              <li>
                <a
                  href="/challenge"
                  onClick={spaClick(() => onNavClick('star_season'))}
                  className="hover:text-emerald-300 transition-colors text-left font-bold text-emerald-400 cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>創星季挑戰賽</span>
                </a>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    if (onStartOnboarding) {
                      onStartOnboarding();
                    } else {
                      onNavClick('about', 'story');
                    }
                  }}
                  className="hover:text-amber-300 transition-colors text-left font-semibold text-amber-400 cursor-pointer flex items-center gap-1.5"
                >
                  <Compass className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>新手導覽教學</span>
                </button>
              </li>
              <li>
                <a href="/explore" onClick={spaClick(() => onNavClick('explore'))} className="hover:text-white transition-colors cursor-pointer text-left">
                  探索問題市場
                </a>
              </li>
              <li>
                <a href="/create" onClick={spaClick(onPostClick)} className="hover:text-white transition-colors text-left cursor-pointer">
                  發布問題需求
                </a>
              </li>
              <li>
                <a href="/solvers" onClick={spaClick(() => onNavClick('solvers'))} className="hover:text-white transition-colors cursor-pointer text-left">
                  認證專家智庫
                </a>
              </li>
              <li>
                <a href="/jobs" onClick={spaClick(() => onNavClick('job_explorer'))} className="hover:text-white transition-colors cursor-pointer text-left">
                  匯職缺・AI 找工作
                </a>
              </li>
              <li>
                <button
                  onClick={() => onNavClick('leaderboard')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  榮譽排行榜
                </button>
              </li>
            </ul>
          </div>

          {/* 關於我們 */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-stone-200 tracking-wider text-[11px]">關於與支援</h4>
            <ul className="space-y-1.5 text-stone-400">
              <li>
                <button
                  onClick={() => onNavClick('about', 'intro')}
                  className="hover:text-white transition-colors text-left cursor-pointer"
                >
                  平台介紹與機制
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavClick('about', 'ip_agents')}
                  className="hover:text-amber-300 transition-colors text-left font-bold text-amber-400 cursor-pointer flex items-center gap-1"
                >
                  <Users className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>原創IP與Agent</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavClick('about', 'tiers')}
                  className="hover:text-white transition-colors text-left cursor-pointer"
                >
                  L0–L4 分級說明
                </button>
              </li>
              <li>
                <button
                  onClick={() => setIsPointsGuideOpen(true)}
                  className="hover:text-white transition-colors text-left cursor-pointer"
                >
                  點數與幣別怎麼用
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavClick('about', 'terms')}
                  className="hover:text-white transition-colors text-left cursor-pointer"
                >
                  服務條款與聲明
                </button>
              </li>
              <li>
                <button
                  onClick={() => openCustomerService({ subject: '平台一般客服諮詢與支援' })}
                  className="hover:text-white transition-colors text-left cursor-pointer"
                >
                  線上客服與回報
                </button>
              </li>
              <li>
                <button
                  onClick={() => triggerDirectAppDownloadOrInstall(openPwaInstallModal)}
                  className="hover:text-amber-300 transition-colors text-left font-semibold text-amber-400 cursor-pointer flex items-center gap-1"
                >
                  <Download className="w-3 h-3 shrink-0" />
                  <span>安裝手機 App</span>
                </button>
              </li>
            </ul>
          </div>

          {/* 熱門標籤與聯絡資訊 */}
          <div className="col-span-2 lg:col-span-1 space-y-3">
            <h4 className="font-bold text-stone-200 tracking-wider text-[11px]">熱門探索標籤</h4>
            <div className="flex flex-wrap gap-1.5">
              {[
                '#商業模式',
                '#AI應用',
                '#創業痛點',
                '#行銷增長',
                '#系統架構',
                '#股權募資',
                '#合約法律',
                '#產品設計',
                '#生醫科技',
                '#跨境電商',
              ].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleTagClick(tag)}
                  className="px-2 py-0.5 bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-amber-300 rounded-md font-medium text-[11px] transition-colors cursor-pointer"
                >
                  {tag}
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-stone-800/60 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-stone-500">
              <a
                href="mailto:ideax.office@gmail.com"
                className="hover:text-stone-300 transition-colors font-mono flex items-center gap-1"
              >
                <Mail className="w-3 h-3 text-stone-500 shrink-0" />
                <span>ideax.office@gmail.com</span>
              </a>
              <span>週一至週五 09:30–18:30</span>
            </div>
          </div>
        </div>

        <div className="pt-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-stone-500">
          <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
            <span>© {new Date().getFullYear()} 創點子 IdeaX</span>
            <span>·</span>
            <span>點子與人才媒合平台</span>
          </div>

          <div className="font-mono text-[10px] text-stone-600 select-none">
            v{APP_VERSION} ({APP_RELEASE_DATE})
            {/* 版本號、更新日與目前模式：所有人都看得到 */}
            {' · '}{isRaceMode ? 'RACE' : isDemoMode ? 'TEST' : isNoPaymentMode ? 'FREE' : 'NORM'}-{isHideTestAccounts ? 'HIDE' : 'SHOW'}
          </div>
        </div>
      </div>
    </footer>
  );
};

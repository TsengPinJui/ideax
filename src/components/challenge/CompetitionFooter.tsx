import React from 'react';
import { Mail, ExternalLink, ArrowRight } from 'lucide-react';
import { APP_VERSION, APP_RELEASE_DATE } from '../../data/versionData';
import { useApp } from '../../context/AppContext';

interface CompetitionFooterProps {
  onBackToOldSite: () => void;
  onNavigate?: (view: 'home' | 'explore' | 'rules' | 'submit' | 'participant' | 'judge' | 'ambassador') => void;
  onOpenGuide?: () => void;
  className?: string;
}

export const CompetitionFooter: React.FC<CompetitionFooterProps> = ({
  onBackToOldSite,
  onNavigate,
  onOpenGuide,
  className = '',
}) => {
  const { isRaceMode, isDemoMode, isNoPaymentMode } = useApp();
  return (
    <footer className={`bg-stone-950 text-stone-300 border-t border-stone-800 pt-10 sm:pt-12 pb-12 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-stone-800/80">
          {/* Logo & 品牌簡介 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 sm:gap-2.5">
              <img
                src="/logo-6-trans-dark.png"
                alt="IdeaX"
                className="h-6 sm:h-7 md:h-8 w-auto object-contain shrink-0"
              />
              <span className="font-black text-white text-lg sm:text-xl md:text-2xl tracking-tight leading-none select-none">
                創星季
              </span>
            </div>
            <p className="text-stone-400 text-xs max-w-xl leading-relaxed">
              聚焦青年創新思維，連結真實產業痛點與市場驗證。全體會員使用創星幣進行模擬募資注資，打造最高榮譽「創之星」。
            </p>
          </div>
        </div>

        {/* 底部導覽與客服聯絡 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-stone-400">
          {/* 聯絡資訊 */}
          <div className="space-y-2">
            <div className="font-bold text-white text-[13px] flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-amber-400" />
              <span>主辦單位聯繫管道</span>
            </div>
            <div className="text-stone-300">
              <span className="text-stone-400">主辦單位：</span>
              <span className="font-bold text-white">IdeaX團隊</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-stone-400">官方 Email：</span>
              <a
                href="mailto:ideax.office@gmail.com"
                className="text-amber-400 hover:text-amber-300 underline font-mono font-bold"
              >
                ideax.office@gmail.com
              </a>
            </div>
            <p className="text-[11px] text-stone-500 pt-1">
              若對競賽時程、點數規則、專家評選或推廣大使機制有任何疑問，歡迎隨時來信洽詢。
            </p>
          </div>

          {/* 快速導覽連結 */}
          {onNavigate && (
            <div className="space-y-2">
              <div className="font-bold text-white text-[13px]">創星季 網站導覽</div>
              <div className="grid grid-cols-2 gap-2 text-stone-400">
                <button
                  type="button"
                  onClick={() => onNavigate('rules')}
                  className="text-left hover:text-amber-400 transition-colors cursor-pointer"
                >
                  • 競賽辦法與條款
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('participant')}
                  className="text-left hover:text-amber-400 transition-colors cursor-pointer"
                >
                  • 申請參賽者
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('submit')}
                  className="text-left hover:text-amber-400 transition-colors cursor-pointer"
                >
                  • 我想提案!
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('explore')}
                  className="text-left hover:text-amber-400 transition-colors cursor-pointer"
                >
                  • 探索Idea
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('judge')}
                  className="text-left hover:text-amber-400 transition-colors cursor-pointer"
                >
                  • 申請成為專家
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('ambassador')}
                  className="text-left hover:text-amber-400 transition-colors cursor-pointer"
                >
                  • 校園推廣大使
                </button>
                {onOpenGuide && (
                  <button
                    type="button"
                    onClick={onOpenGuide}
                    className="text-left text-amber-300 hover:text-amber-200 font-bold transition-colors cursor-pointer col-span-2 pt-1 flex items-center gap-1"
                  >
                    <span>• 🔰 創星季玩法導覽 (3大角色 30秒上手)</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 平台宗旨 */}
          <div className="space-y-2">
            <div className="font-bold text-white text-[13px]">IdeaX 平台價值</div>
            <p className="text-[11px] text-stone-400 leading-relaxed">
              IdeaX 創點子平台旨在提供解決痛點的高價值問答與創新提案市場。在創星季中發表的切身痛點與優秀提案，皆可同步連結至主平台持續獲得專業諮詢與市場落地機會。
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={onBackToOldSite}
                className="text-amber-400 hover:text-amber-300 underline font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <span>前往IdeaX創點子 平台</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* 頁尾版權條 */}
        <div className="pt-6 border-t border-stone-800 text-[11px] text-stone-500 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div>
            © {new Date().getFullYear()} 創星季 · 主辦單位: IdeaX團隊 · All rights reserved.
          </div>
          <div className="flex items-center gap-2.5 flex-wrap justify-center sm:justify-end">
            <span>官方信箱: ideax.office@gmail.com</span>
            <span>•</span>
            <span className="font-mono text-stone-500">
              v{APP_VERSION} • {APP_RELEASE_DATE} • {isRaceMode ? 'RACE' : isDemoMode ? 'TEST' : isNoPaymentMode ? 'FREE' : 'NORM'}
            </span>
            <span>•</span>
            <button
              type="button"
              onClick={onBackToOldSite}
              className="text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer"
            >
              IdeaX創點子平台
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

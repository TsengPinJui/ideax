import React from 'react';
import { Mail, ExternalLink, ArrowRight, Sparkles, Send, Flame, ShieldCheck, GraduationCap, Award } from 'lucide-react';

interface CompetitionFooterProps {
  onBackToOldSite: () => void;
  onNavigate?: (view: 'home' | 'explore' | 'rules' | 'submit' | 'participant' | 'judge' | 'ambassador') => void;
  className?: string;
}

export const CompetitionFooter: React.FC<CompetitionFooterProps> = ({
  onBackToOldSite,
  onNavigate,
  className = '',
}) => {
  return (
    <footer className={`bg-stone-950 text-stone-300 border-t border-stone-800 pt-10 sm:pt-12 pb-12 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-stone-800/80">
          {/* Logo & 主辦單位資訊 */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <img
                src="/logo-6-trans-dark.png"
                alt="IdeaX Logo"
                className="h-10 sm:h-12 w-auto object-contain shrink-0"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-white text-base sm:text-lg tracking-tight">IdeaX 創星季</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-stone-950">
                    青年創新挑戰實戰
                  </span>
                </div>
                <div className="text-xs text-amber-400 font-bold mt-0.5">
                  主辦單位：IdeaX團隊
                </div>
              </div>
            </div>
            <p className="text-stone-400 text-xs max-w-xl leading-relaxed">
              聚焦青年創新思維，連結真實產業痛點與市場驗證。全體會員使用創星幣進行模擬募資注資，打造最高榮譽「創之星」。
            </p>
          </div>

          {/* 造訪 IdeaX創點子 平台的入口 (醒目按鈕) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto shrink-0">
            <button
              type="button"
              onClick={onBackToOldSite}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-stone-950 font-black text-xs sm:text-sm shadow-md hover:shadow-lg transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2 group"
              title="前往 IdeaX 創點子主平台探索懸賞問題與專家智庫"
            >
              <Sparkles className="w-4 h-4 text-stone-950" />
              <span>造訪 IdeaX創點子 平台</span>
              <ArrowRight className="w-4 h-4 text-stone-950 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              type="button"
              onClick={onBackToOldSite}
              className="px-4 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-2xs transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
              title="直接前往痛點專區"
            >
              <Flame className="w-4 h-4 text-white" />
              <span>痛點專區 →</span>
            </button>
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
              <div className="font-bold text-white text-[13px]">競賽單元快速導覽</div>
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
                  onClick={() => onNavigate('explore')}
                  className="text-left hover:text-amber-400 transition-colors cursor-pointer"
                >
                  • 探索Idea
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
                  onClick={() => onNavigate('participant')}
                  className="text-left hover:text-amber-400 transition-colors cursor-pointer"
                >
                  • 申請參賽者
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
                <span>立即造訪 IdeaX 創點子平台首頁</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* 頁尾版權條 */}
        <div className="pt-6 border-t border-stone-800 text-[11px] text-stone-500 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div>
            © {new Date().getFullYear()} IdeaX 創星季 · 主辦單位: IdeaX團隊 · All rights reserved.
          </div>
          <div className="flex items-center gap-3">
            <span>官方信箱: ideax.office@gmail.com</span>
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

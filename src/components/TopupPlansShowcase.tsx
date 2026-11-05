import React from 'react';
import { Tag, Flame, Briefcase, Crown, Coins, Check, Info, MessageCircle } from 'lucide-react';
import { RECHARGE_PACKAGES } from '../types';

/**
 * 點數儲值方案（照官方設計圖）：四種面額卡片＋購買方式說明
 * 價格與點數一律讀 RECHARGE_PACKAGES（和後台、儲值紀錄同一份），這裡只補上各方案的說明文字與圖示。
 * 目前採人工匯款儲值：按「私訊客服購買」打開客服視窗，並帶上所選方案。
 */
const PLAN_DETAILS: Record<string, { icon: React.ElementType; iconClass: string; features: string[] }> = {
  'pack-299': { icon: Tag, iconClass: 'text-amber-400', features: ['單次體驗', 'L1 痛點排查', '解鎖特定方案'] },
  'pack-599': { icon: Flame, iconClass: 'text-orange-500', features: ['多題懸賞發問', 'L2 商業架構解析', '深度打賞'] },
  'pack-999': { icon: Briefcase, iconClass: 'text-stone-900', features: ['持續尋求專業解答', '發布高吸引力懸賞題'] },
  'pack-2999': { icon: Crown, iconClass: 'text-amber-400', features: ['專案重磅委託', 'L3/L4 企業級顧問', '難題深度諮詢'] },
};

interface Props {
  onContact: (topic: string) => void;
}

export const TopupPlansShowcase: React.FC<Props> = ({ onContact }) => {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-white text-stone-900 shadow-2xl px-4 py-6 sm:px-8 sm:py-9">
      {/* 右上、右下的黃色斜角裝飾 */}
      <div className="pointer-events-none absolute -right-16 top-20 h-64 w-40 rotate-[35deg] bg-gradient-to-b from-amber-200/60 to-transparent" />
      <div className="pointer-events-none absolute -bottom-10 -right-6 h-24 w-24 rotate-45 bg-amber-300/70" />
      <div className="pointer-events-none absolute -left-10 bottom-24 h-32 w-20 rotate-[35deg] bg-gradient-to-t from-amber-100/80 to-transparent" />

      {/* 頁頭：Logo｜點數儲值方案 */}
      <header className="relative flex items-center gap-4 sm:gap-8">
        <div className="flex items-center gap-2 shrink-0">
          <img src="/logo-bulb.png" alt="" className="h-12 w-12 sm:h-16 sm:w-16 object-contain" />
          <div className="leading-none">
            <div className="text-2xl sm:text-4xl font-black tracking-tight">
              創<span className="text-amber-400">點</span>子
            </div>
            <div className="mt-1 text-sm sm:text-lg font-black text-stone-800">
              Idea<span className="text-amber-500">X</span>
            </div>
          </div>
        </div>
        <div className="h-12 sm:h-16 w-px bg-stone-300" />
        <h2 className="text-2xl sm:text-5xl font-black tracking-wide">點數儲值方案</h2>
      </header>

      {/* 四種方案 */}
      <div className="relative mt-7 sm:mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {RECHARGE_PACKAGES.map((pkg) => {
          const d = PLAN_DETAILS[pkg.id] || { icon: Coins, iconClass: 'text-amber-400', features: [] };
          const Icon = d.icon;
          const hot = !!pkg.isPopular;
          const topic = `購買點數：${pkg.tag} NT$ ${pkg.price.toLocaleString()}（${pkg.totalPoints.toLocaleString()} 點）`;
          return (
            <div
              key={pkg.id}
              className={`flex flex-col rounded-3xl border p-5 sm:p-6 shadow-lg ${
                hot ? 'border-amber-300 bg-gradient-to-b from-amber-50 to-amber-100/70 ring-2 ring-amber-300/60' : 'border-stone-100 bg-white'
              }`}
            >
              <div className="flex items-center justify-center gap-2.5">
                <Icon className={`h-7 w-7 ${d.iconClass}`} strokeWidth={2.4} />
                <span className="text-xl font-black">{pkg.tag}</span>
              </div>
              <div className="mt-4 text-center">
                <span className="mr-1.5 text-lg font-black">NT$</span>
                <span className="text-5xl font-black tracking-tight">{pkg.price.toLocaleString()}</span>
              </div>
              <div className={`mx-auto mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2.5 ${hot ? 'bg-white/70' : 'bg-amber-50'}`}>
                <Coins className="h-6 w-6 text-amber-500" />
                <span className="text-base font-bold">獲得</span>
                <span className="text-3xl font-black">{pkg.totalPoints.toLocaleString()}</span>
                <span className="text-base font-bold">點</span>
              </div>
              <div className="my-5 h-px bg-stone-200" />
              <ul className="flex-1 space-y-3">
                {d.features.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-base font-medium text-stone-800">
                    <Check className="h-5 w-5 shrink-0 text-amber-400" strokeWidth={3} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => onContact(topic)}
                className={`mt-6 w-full rounded-2xl py-2.5 text-sm font-black transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                  hot ? 'bg-amber-400 text-stone-950 hover:bg-amber-300' : 'bg-stone-900 text-white hover:bg-stone-700'
                }`}
              >
                <MessageCircle className="h-4 w-4" />
                <span>私訊客服購買</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* 購買方式 */}
      <div className="relative mt-6 sm:mt-8 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 rounded-3xl bg-white p-4 sm:p-5 shadow-lg ring-1 ring-stone-100">
        <div className="inline-flex shrink-0 items-center gap-3 self-start rounded-full bg-amber-50 px-5 py-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-400 text-white">
            <Info className="h-5 w-5" strokeWidth={3} />
          </span>
          <span className="text-xl font-black">購買方式</span>
        </div>
        <div className="hidden sm:block h-12 w-px bg-amber-200" />
        <div className="flex-1 space-y-1 text-sm sm:text-base leading-relaxed text-stone-800">
          <p>目前採人工匯款儲值，第三方金流服務正在串接中。</p>
          <p>若需購買點數，請私訊客服，我們將提供匯款資訊並協助入帳。</p>
        </div>
        <button
          type="button"
          onClick={() => onContact('購買點數（人工匯款儲值）')}
          className="shrink-0 rounded-2xl bg-amber-400 px-5 py-3 text-sm font-black text-stone-950 hover:bg-amber-300 cursor-pointer flex items-center justify-center gap-1.5"
        >
          <MessageCircle className="h-4 w-4" />
          <span>私訊客服</span>
        </button>
      </div>
    </section>
  );
};

export default TopupPlansShowcase;

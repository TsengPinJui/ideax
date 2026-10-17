import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Coins, Banknote, Star, Gift, Target, Unlock, ArrowRight } from 'lucide-react';

interface PointsGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ITEMS: Array<{
  key: string;
  name: string;
  icon: React.ReactNode;
  tone: string;
  what: string;
  note?: string;
}> = [
  {
    key: 'twd',
    name: '新台幣（NT$）',
    icon: <Banknote className="w-5 h-5" />,
    tone: 'bg-stone-100 text-stone-700 border-stone-200',
    what: '用來衡量價值，以及購買平台點數。',
  },
  {
    key: 'points',
    name: '點數',
    icon: <Coins className="w-5 h-5" />,
    tone: 'bg-amber-100 text-amber-800 border-amber-200',
    what: '平台內通用。可用來解鎖解答者的付費方案、兌換平台功能、打賞與懸賞。',
  },
  {
    key: 'star',
    name: '創星幣',
    icon: <Star className="w-5 h-5" />,
    tone: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    what: '只用在創星季競賽的模擬募資，可以注資支持你喜歡的解方提案。',
    note: '創星幣不是真實貨幣，不能購買、轉帳或兌現，也不能和點數互換。',
  },
  {
    key: 'tip',
    name: '打賞',
    icon: <Gift className="w-5 h-5" />,
    tone: 'bg-rose-100 text-rose-700 border-rose-200',
    what: '用點數支持提案，打賞的點數百分之百給提案者。',
  },
  {
    key: 'bounty',
    name: '懸賞',
    icon: <Target className="w-5 h-5" />,
    tone: 'bg-orange-100 text-orange-800 border-orange-200',
    what: '提問者可以為問題設定賞金，吸引解答者提出看法。',
    note: '發布時會先預扣一部分，待按件完成後，轉為解答者可提領的額度。',
  },
  {
    key: 'unlock',
    name: '解鎖',
    icon: <Unlock className="w-5 h-5" />,
    tone: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    what: '支付點數取得某項功能權限，例如觀看解答者提出的方案內容。',
  },
];

/** 「點數與幣別怎麼用」說明視窗：一次講清楚新台幣、點數、創星幣、打賞、懸賞、解鎖的差別 */
export const PointsGuideModal: React.FC<PointsGuideModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] bg-stone-950/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="點數與幣別怎麼用"
    >
      <div
        className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white/95 backdrop-blur px-5 sm:px-6 pt-5 pb-3 border-b border-stone-100 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-stone-900">點數與幣別怎麼用？</h2>
            <p className="text-xs text-stone-500 mt-1">一次看懂平台上的錢、點數與創星幣</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-stone-100 flex items-center justify-center cursor-pointer shrink-0"
            aria-label="關閉"
          >
            <X className="w-4 h-4 text-stone-500" />
          </button>
        </div>

        {/* 流向示意 */}
        <div className="px-5 sm:px-6 pt-4">
          <div className="rounded-2xl bg-amber-50/70 border border-amber-200/80 p-3.5 text-xs text-stone-700 leading-relaxed">
            <div className="flex flex-wrap items-center gap-1.5 font-bold text-stone-800">
              <span className="px-2 py-0.5 rounded-md bg-white border border-stone-200">新台幣</span>
              <ArrowRight className="w-3.5 h-3.5 text-amber-600" />
              <span className="px-2 py-0.5 rounded-md bg-amber-100 border border-amber-200 text-amber-900">點數</span>
              <ArrowRight className="w-3.5 h-3.5 text-amber-600" />
              <span>懸賞・解鎖・打賞・平台功能</span>
            </div>
            <p className="mt-2 text-stone-500">
              <span className="font-bold text-emerald-700">創星季</span> 另外使用 <span className="font-bold text-emerald-700">創星幣</span> 進行模擬募資，和點數分開計算。
            </p>
          </div>
        </div>

        <ul className="px-5 sm:px-6 py-4 space-y-2.5">
          {ITEMS.map((it) => (
            <li key={it.key} className="flex gap-3 rounded-2xl border border-stone-200/80 p-3.5">
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${it.tone}`}>{it.icon}</div>
              <div className="min-w-0">
                <h3 className="text-sm font-black text-stone-900">{it.name}</h3>
                <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">{it.what}</p>
                {it.note && <p className="text-[11px] text-stone-500 mt-1 leading-relaxed">※ {it.note}</p>}
              </div>
            </li>
          ))}
        </ul>

        <div className="px-5 sm:px-6 pb-5">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white text-sm font-black cursor-pointer"
          >
            我知道了
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

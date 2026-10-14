import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Question } from '../types';
import {
  Coins,
  Heart,
  Sparkles,
  ShieldCheck,
  X,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  CreditCard,
  Building2,
  Calendar,
} from 'lucide-react';

interface TipPainPointModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: Question;
  onSuccess?: (amount: number) => void;
}

export const TipPainPointModal: React.FC<TipPainPointModalProps> = ({
  isOpen,
  onClose,
  question,
  onSuccess,
}) => {
  const { currentUser, tipPainPoint, addNotification } = useApp();

  const PRESET_AMOUNTS = [50, 100, 200, 500, 1000, 2000];
  const [selectedAmount, setSelectedAmount] = useState<number>(100);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [cheerMessage, setCheerMessage] = useState<string>('這痛點真的太有共鳴了！期待能看見好的落地解方！');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const effectiveAmount = customAmount ? parseInt(customAmount, 10) || 0 : selectedAmount;
  const userBalance = currentUser?.balance || 0;
  const isInsufficient = userBalance < effectiveAmount;

  const handlePresetClick = (amt: number) => {
    setSelectedAmount(amt);
    setCustomAmount('');
    setErrorMsg(null);
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    setCustomAmount(val);
    setErrorMsg(null);
  };

  const handleConfirmTip = () => {
    if (effectiveAmount <= 0) {
      setErrorMsg('打賞點數必須大於 0 點！');
      return;
    }
    if (isInsufficient) {
      setErrorMsg(`點數餘額不足！目前餘額 ${userBalance.toLocaleString()} 點，需 ${effectiveAmount.toLocaleString()} 點。`);
      return;
    }
    if (currentUser?.id === question.authorId) {
      setErrorMsg('無法打賞給自己發布的痛點喔！');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = tipPainPoint(question.id, effectiveAmount, cheerMessage.trim());
      if (res.success) {
        setIsSuccess(true);
        if (onSuccess) onSuccess(effectiveAmount);
        setTimeout(() => {
          setIsSuccess(false);
          onClose();
        }, 2200);
      } else {
        setErrorMsg(res.message || '打賞失敗，請稍後再試！');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || '打賞過程發生錯誤');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 text-stone-950 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-stone-950 text-amber-400 flex items-center justify-center shadow-md">
              <Coins className="w-5 h-5 fill-amber-400" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-1.5">
                <span>讀者支持點數 • 為好痛點打賞</span>
              </h3>
              <p className="text-xs font-semibold text-stone-850">
                支持原創痛點洞察，激勵更多生活實踐
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/10 text-stone-900 transition-colors cursor-pointer"
            title="關閉"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
          {/* Target Pain Point Snippet */}
          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10.5px] font-extrabold px-2 py-0.5 rounded-full bg-amber-200 text-amber-950">
                目標痛點洞察
              </span>
              <span className="text-stone-500 text-[11px]">
                提案者：<strong className="text-stone-800">{question.authorName}</strong>
              </span>
            </div>
            <h4 className="font-extrabold text-sm text-stone-900 line-clamp-2">
              {question.title}
            </h4>
            <div className="text-[11px] text-amber-900 font-bold flex items-center gap-2 flex-wrap">
              <span>目前已獲讀者支持：🪙 {(question.supportPoints || 0).toLocaleString()} 點</span>
              <span>•</span>
              <span>{(question.tippersCount || question.tipsHistory?.length || 0)} 人支持</span>
            </div>
          </div>

          {/* Logic Explanation Box */}
          <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-1.5 leading-relaxed text-stone-600">
            <div className="flex items-center gap-1.5 font-bold text-stone-900">
              <Building2 className="w-4 h-4 text-purple-600" />
              <span>收益入帳與撥款說明</span>
            </div>
            <p>
              讀者支持點數將和<strong>提案專家</strong>的邏輯相同，先存入作者的<strong>【點數收支 &gt; 應收帳款】</strong>中，系統<strong>每週一 00:00 統一結算</strong>一次「本週獲得打賞 ×××× 點」。
            </p>
            <div className="p-2 rounded-lg bg-white border border-stone-200/90 text-[11px] flex items-center gap-2 text-stone-700">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                提痛點者需完成<strong>實名身分核驗</strong>並綁定<strong>收款銀行帳戶</strong>後始能申請撥款（撥款會扣除相關平台手續費，非直接點數額度）。
              </span>
            </div>
          </div>

          {/* Select Amount */}
          <div className="space-y-2">
            <label className="font-extrabold text-stone-900 flex items-center justify-between text-xs">
              <span>選擇打賞支持點數</span>
              <span className="text-stone-500 font-mono">
                我的點數餘額：<strong className="text-amber-800">{userBalance.toLocaleString()} 點</strong>
              </span>
            </label>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {PRESET_AMOUNTS.map((amt) => {
                const isSelected = !customAmount && selectedAmount === amt;
                return (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handlePresetClick(amt)}
                    className={`py-2 px-1 rounded-xl text-center font-black transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-amber-500 text-stone-950 border-amber-500 ring-2 ring-amber-300 shadow-2xs scale-102'
                        : 'bg-white hover:bg-amber-50 text-stone-700 border-stone-200'
                    }`}
                  >
                    <span className="font-mono text-sm block">{amt}</span>
                    <span className="text-[10px] font-normal block text-stone-500">點</span>
                  </button>
                );
              })}
            </div>

            {/* Custom Amount */}
            <div className="pt-1">
              <div className="relative">
                <input
                  type="text"
                  value={customAmount}
                  onChange={handleCustomChange}
                  placeholder="自訂打賞點數額度（例如：300）"
                  className="w-full px-3 py-2 pr-12 rounded-xl bg-white border border-stone-300 text-xs font-mono font-bold text-stone-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-stone-400">
                  點
                </span>
              </div>
            </div>
          </div>

          {/* Cheer Message */}
          <div className="space-y-1.5">
            <label className="font-bold text-stone-800 block text-xs">
              給提案者的鼓勵與寄語 (選填)
            </label>
            <textarea
              rows={2}
              value={cheerMessage}
              onChange={(e) => setCheerMessage(e.target.value)}
              placeholder="寫下一句打氣的話，或你對這痛點的期待..."
              className="w-full p-2.5 rounded-xl bg-white border border-stone-300 text-xs text-stone-900 outline-none focus:border-amber-500 resize-none"
            />
          </div>

          {/* Insufficient balance alert */}
          {isInsufficient && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>點數餘額不足（差 {(effectiveAmount - userBalance).toLocaleString()} 點）</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (typeof window !== 'undefined') {
                    window.history.pushState(null, '', '/topup');
                    window.dispatchEvent(new Event('popstate'));
                  }
                }}
                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-[11px] cursor-pointer shadow-2xs"
              >
                前往儲值 ↗
              </button>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Success Box */}
          {isSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 font-extrabold flex items-center gap-2 animate-in zoom-in-95">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <span>🎉 打賞成功！感謝您對真實痛點洞察的支持！</span>
                <p className="text-[11px] text-emerald-700 font-normal mt-0.5">
                  點數已撥入提案者的【應收帳款】，一週結算一次。
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between gap-3">
          <div className="text-xs">
            <span className="text-stone-500 block">本次支持支付</span>
            <span className="font-black text-stone-900 font-mono text-base">
              {effectiveAmount.toLocaleString()} <span className="text-xs font-normal">點</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs font-bold cursor-pointer transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleConfirmTip}
              disabled={isSubmitting || effectiveAmount <= 0 || isInsufficient || isSuccess}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 font-black text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              <Heart className="w-4 h-4 fill-stone-950" />
              <span>{isSubmitting ? '打賞處理中...' : `送出支持 ${effectiveAmount.toLocaleString()} 點`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

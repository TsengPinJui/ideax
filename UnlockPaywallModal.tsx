import React, { useState } from 'react';
import { Answer, Question } from '../types';
import { useApp } from '../context/AppContext';
import {
  X,
  Lock,
  Unlock,
  ShieldCheck,
  CheckCircle2,
  CreditCard,
  Coins,
  ArrowLeft,
  ArrowRight,
  Flame,
  FileText,
  Video,
  UploadCloud,
  Paperclip,
  Layers,
  Sparkles,
} from 'lucide-react';
import { getAnswerSpecifications } from '../utils/answerUtils';

interface UnlockPaywallModalProps {
  answer: Answer;
  onClose: () => void;
  onSuccess: () => void;
  isFullPage?: boolean;
}

export const UnlockPaywallModal: React.FC<UnlockPaywallModalProps> = ({
  answer,
  onClose,
  onSuccess,
  isFullPage = false,
}) => {
  const { currentUser, questions, unlockAnswer, calculateSplitPayout } = useApp();

  const targetQ = questions.find((q) => q.id === answer.questionId);
  const isAuthor = Boolean(targetQ && targetQ.authorId === currentUser.id);
  const isPainPointOrFree = targetQ?.postType === 'pain_point' || (targetQ?.bounty ?? 0) === 0;
  const availableWithheld = isAuthor ? (targetQ?.withheldBounty || 0) : 0;

  const [useWithheldOffset, setUseWithheldOffset] = useState<boolean>(availableWithheld > 0);
  const [paymentMethod] = useState<'平台點數扣點'>('平台點數扣點');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const price = answer.price || 0;
  const offsetAmount = useWithheldOffset && availableWithheld > 0 ? Math.min(price, availableWithheld) : 0;
  const balanceToPay = Math.max(0, price - offsetAmount);
  const currentPoints = currentUser?.balance || 0;
  const spec = getAnswerSpecifications(answer);

  const handleUnlock = () => {
    setErrorMessage(null);
    if (balanceToPay > 0 && currentPoints < balanceToPay) {
      setErrorMessage(
        `您的平台點數餘額不足（目前餘額 ${currentPoints.toLocaleString()} 點 / 需支付 ${balanceToPay.toLocaleString()} 點）。目前暫時僅支援以平台點數扣點解鎖方案。`
      );
      return;
    }

    setIsProcessing(true);

    setTimeout(() => {
      const success = unlockAnswer(answer.id, useWithheldOffset, paymentMethod);
      setIsProcessing(false);
      if (success) {
        setIsSuccess(true);
        setTimeout(() => {
          onSuccess();
        }, 1200);
      } else {
        setErrorMessage('平台點數餘額不足或解鎖失敗，請確認帳戶點數餘額。');
      }
    }, 600);
  };

  const content = (
    <div
      className={`bg-white rounded-3xl border border-stone-200 shadow-xl w-full ${
        isFullPage
          ? 'max-w-xl mx-auto my-6'
          : 'max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150'
      }`}
    >
      {/* Header */}
      <div className="p-5 border-b border-stone-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-900 flex items-center justify-center font-black shrink-0">
            <Lock className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-stone-900 flex items-center gap-1.5">
              <span>平台點數安全解鎖方案</span>
            </h3>
            <p className="text-xs text-stone-500">
              解答者：<strong className="text-stone-800">{answer.solverName}</strong>
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
          title="關閉"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="p-5 sm:p-6 space-y-4">
        {/* Pain Point / Free Post Notice */}
        {isPainPointOrFree && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-950 flex items-start gap-2.5">
            <Flame className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5 leading-relaxed">
              <span className="font-extrabold text-rose-900">痛點免費提出 • 專家自訂落地方案解鎖：</span>
              <p className="text-[11px] text-rose-800">
                本問題為免費發布之痛點/討論。下方解答者已精心研擬專屬深度解決方案，需使用平台點數支付<strong>解答者所設定價（{price.toLocaleString()} 點）</strong>進行解鎖。
              </p>
            </div>
          </div>
        )}

        {/* 方案規格明細（所含內容類型和數量、交付方式） */}
        <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 text-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-stone-900 border-b border-stone-200/60 pb-1.5">
            <span className="flex items-center gap-1.5 text-stone-900 font-extrabold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>方案規格（解鎖後交付內容）</span>
            </span>
            <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-900 border border-purple-200 text-[10px] font-bold flex items-center gap-1">
              <Layers className="w-3 h-3 text-purple-600" />
              <span>{spec.deliveryMethod}</span>
            </span>
          </div>

          <div className="space-y-1.5 text-xs text-stone-700">
            <div className="flex items-start gap-1.5 flex-wrap">
              <span className="font-bold text-stone-900 shrink-0">所含內容：</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {spec.items.map((it, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-md bg-white text-stone-800 font-semibold text-[11px] border border-stone-200 flex items-center gap-1"
                  >
                    {it.iconType === 'text' && <FileText className="w-3 h-3 text-stone-600" />}
                    {it.iconType === 'file' && <UploadCloud className="w-3 h-3 text-amber-600" />}
                    {it.iconType === 'link' && <Paperclip className="w-3 h-3 text-sky-600" />}
                    {it.iconType === 'meeting' && <Video className="w-3 h-3 text-blue-600" />}
                    <span>{it.label}</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-stone-600 pt-0.5">
              <span className="font-bold text-stone-800 shrink-0">交付方式：</span>
              <span className="font-semibold text-stone-800">{spec.deliveryMethod}</span>
              <span className="text-stone-400">
                （{spec.isPhased ? `共 ${answer.phases?.length} 個階段，按階段推進並驗收放款` : '一次性交付完整內容與專屬資源'}）
              </span>
            </div>
          </div>

          <div className="text-stone-600 line-clamp-2 pt-1 border-t border-stone-200/50 italic text-[11px]">
            "{answer.freePreview.slice(0, 110)}..."
          </div>
        </div>

        {/* 解鎖定價方塊 */}
        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2 text-xs">
          <div className="flex justify-between items-center text-stone-700">
            <span className="font-bold text-sm">解鎖方案定價：</span>
            <div className="flex items-baseline gap-1 font-mono">
              <span className="font-black text-stone-900 text-xl">
                {price.toLocaleString()}
              </span>
              <span className="text-xs text-stone-500 font-sans">點</span>
            </div>
          </div>
          <p className="text-[11px] text-stone-500 flex items-center gap-1 pt-1 border-t border-amber-200/80">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>平台點數安全託管・確認驗收履約保障</span>
          </p>
        </div>

        {/* 提問者原懸賞預扣額折抵選項（若有） */}
        {isAuthor && availableWithheld > 0 && (
          <div className="p-3.5 rounded-2xl bg-white border border-amber-300 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-950 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-amber-600" />
                <span>本問題原懸賞預扣點數：</span>
              </span>
              <span className="font-mono font-black text-amber-900">
                {availableWithheld.toLocaleString()} 點
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-2 p-2 rounded-xl bg-amber-50/50 border border-amber-200 cursor-pointer text-xs">
                <input
                  type="radio"
                  name="withheldOption"
                  checked={useWithheldOffset}
                  onChange={() => setUseWithheldOffset(true)}
                  className="accent-amber-600 cursor-pointer"
                />
                <div className="flex-1">
                  <span className="font-bold text-stone-900 block">使用原懸賞預扣額折抵</span>
                  <span className="text-[11px] text-stone-500">
                    折抵 {offsetAmount.toLocaleString()} 點
                    {balanceToPay > 0
                      ? `，差額 ${balanceToPay.toLocaleString()} 點由平台帳戶點數扣抵`
                      : '（全額折抵，無需額外扣點）'}
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-xl bg-white border border-stone-200 cursor-pointer text-xs">
                <input
                  type="radio"
                  name="withheldOption"
                  checked={!useWithheldOffset}
                  onChange={() => setUseWithheldOffset(false)}
                  className="accent-amber-600 cursor-pointer"
                />
                <div>
                  <span className="font-bold text-stone-900 block">直接以平台點數全額扣點</span>
                  <span className="text-[11px] text-stone-500">
                    保留本問題原懸賞預扣點數供後續其他方案採納
                  </span>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Payment Method Selector (Points only; external payment disabled) */}
        {balanceToPay > 0 && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-700 block flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-amber-600" />
              <span>付款方式（目前暫時只支援平台點數扣點）：</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <button
                type="button"
                className="p-2.5 rounded-xl border border-amber-500 bg-amber-50 text-stone-950 font-black ring-2 ring-amber-300 shadow-2xs text-center cursor-pointer"
              >
                <div className="text-xs">🪙 平台點數扣點</div>
                <div className="text-[10px] text-amber-700 font-normal mt-0.5">
                  餘額 {currentPoints.toLocaleString()} 點
                </div>
              </button>
              {(['信用卡', 'LINE Pay', 'Apple Pay', 'ATM 轉帳'] as const).map((method) => (
                <button
                  key={method}
                  type="button"
                  disabled
                  className="p-2.5 rounded-xl border border-stone-200 bg-stone-50 text-stone-400 opacity-60 text-center cursor-not-allowed"
                >
                  <div className="text-xs font-bold">{method}</div>
                  <div className="text-[10px] text-stone-400 font-normal mt-0.5">暫不支援</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200">
            {errorMessage}
          </div>
        )}

        {/* Security guarantee & Legal Compliance */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[11px] text-stone-500 bg-stone-50 p-2.5 rounded-xl border border-stone-200">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              解鎖後永久綁定帳號，隨時查閱完整方案內容、下載附件檔案或預約線上諮詢。
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-amber-50/50 border border-amber-200/70 text-[10px] text-stone-500 leading-relaxed">
            依據《消費者保護法》第 19 條第 2 項及《通訊交易解除權合理例外情事準用原則》，本付費解答屬「非以有形媒介提供之數位內容，一經提供即為完成之線上服務」，經您點擊扣點解鎖即視為同意即時交付，排除七日無條件解除權。
          </div>
        </div>

        {isSuccess && (
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-900 text-xs font-bold flex items-center gap-2 border border-emerald-200 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>平台點數扣抵成功！方案已解鎖開放閱讀。</span>
          </div>
        )}

        {/* Actions */}
        <div className="pt-2 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100 text-xs font-semibold cursor-pointer"
          >
            {isFullPage ? '取消返回' : '取消'}
          </button>
          <button
            type="button"
            onClick={handleUnlock}
            disabled={isProcessing || isSuccess}
            className="flex-1 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 font-black text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Unlock className="w-4 h-4" />
            <span>
              {isProcessing
                ? '平台點數扣抵處理中...'
                : isSuccess
                ? '解鎖成功！'
                : balanceToPay > 0
                ? `扣抵 ${balanceToPay.toLocaleString()} 點解鎖方案`
                : '使用預扣點數全額折抵解鎖'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {content}
    </div>
  );
};

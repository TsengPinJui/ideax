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
  Sparkles,
} from 'lucide-react';

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
  const [paymentMethod, setPaymentMethod] = useState<'信用卡' | 'LINE Pay' | 'Apple Pay' | 'ATM 轉帳'>('信用卡');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const price = answer.price || 0;
  const offsetAmount = useWithheldOffset && availableWithheld > 0 ? Math.min(price, availableWithheld) : 0;
  const balanceToPay = Math.max(0, price - offsetAmount);

  // Real-time automatic split calculation
  const split = calculateSplitPayout(price, answer.solverId);

  const handleUnlock = () => {
    setIsProcessing(true);

    setTimeout(() => {
      const success = unlockAnswer(answer.id, useWithheldOffset, paymentMethod);
      setIsProcessing(false);
      if (success) {
        setIsSuccess(true);
        setTimeout(() => {
          onSuccess();
        }, 1200);
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
          {isFullPage && (
            <button
              onClick={onClose}
              className="p-1.5 -ml-1 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors flex items-center gap-1 text-xs font-bold cursor-pointer"
              title="返回問題市場"
            >
              <ArrowLeft className="w-4 h-4 text-amber-600" />
            </button>
          )}
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-900 flex items-center justify-center font-black">
            <Lock className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-stone-900 flex items-center gap-1.5">
              <span>第三方支付安全解鎖方案</span>
            </h3>
            <p className="text-xs text-stone-500">
              解答者：<strong className="text-stone-800">{answer.solverName}</strong>
            </p>
          </div>
        </div>
        {!isFullPage ? (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={onClose}
            className="px-2.5 py-1 rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-600 text-xs font-semibold flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>返回問題市場</span>
          </button>
        )}
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
                本問題為免費發布之痛點/討論。下方解答者已精心研擬專屬深度解決方案，需透過平台支援的第三方支付付<strong>解答者所設金額（NT$ {price.toLocaleString()} 元）</strong>進行解鎖。
              </p>
            </div>
          </div>
        )}

        {/* Target Answer Brief */}
        <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-stone-500 font-medium">方案交付形式：</span>
            <span className="font-extrabold text-stone-900 bg-white px-2 py-0.5 rounded-md border border-stone-200">
              {answer.deliveryType}
            </span>
          </div>
          {answer.deliveryFormat === 'meeting' && (
            <div className="flex items-center gap-1.5 text-blue-700 text-[11px] font-bold">
              <Video className="w-3.5 h-3.5" />
              <span>含 {answer.meetingDetails?.durationMinutes || 30} 分鐘 1 對 1 線上諮詢會談</span>
            </div>
          )}
          {answer.deliveryFormat === 'file' && (
            <div className="flex items-center gap-1.5 text-emerald-700 text-[11px] font-bold">
              <FileText className="w-3.5 h-3.5" />
              <span>含專屬實戰落地檔案與資料下載（{answer.attachments?.length || 1} 份）</span>
            </div>
          )}
          <div className="text-stone-600 line-clamp-2 pt-1 italic text-[11px]">
            "{answer.freePreview.slice(0, 110)}..."
          </div>
        </div>

        {/* Pricing Breakdown & Third-Party Split Box */}
        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2 text-xs">
          <div className="flex justify-between items-center text-stone-700">
            <span className="font-bold">解答者所設解鎖定價：</span>
            <span className="font-black text-stone-900 font-mono text-base">
              NT$ {price.toLocaleString()} 元
            </span>
          </div>

          <div className="pt-2 border-t border-amber-200/80 space-y-1 text-[11px]">
            <span className="text-stone-500 font-bold block">
              ⚡ 第三方交易款項自動拆分預覽（平台確認後即時撥款）：
            </span>
            <div className="flex items-center justify-between text-stone-700">
              <span>解答者實收（實收 {split.sellerPayoutText}，{split.feeDiscountText} 由賣家吸收）：</span>
              <span className="font-mono font-black text-emerald-800">
                NT$ {split.netPayout.toLocaleString()} 元
              </span>
            </div>
            <div className="flex items-center justify-between text-stone-700">
              <span>IdeaX 平台服務費：</span>
              <span className="font-mono font-bold text-stone-600">
                NT$ {split.platformFee.toLocaleString()} 元
              </span>
            </div>
            <div className="flex items-center justify-between text-stone-400 text-[10px] pt-0.5">
              <span>自動撥付指定帳戶：</span>
              <span className="font-mono truncate max-w-[200px] text-stone-600">{split.bankAccountSnapshot}</span>
            </div>
          </div>
        </div>

        {/* 提問者原懸賞預扣額折抵選項（若有） */}
        {isAuthor && availableWithheld > 0 && (
          <div className="p-3.5 rounded-2xl bg-white border border-amber-300 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-950 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-amber-600" />
                <span>本問題原懸賞預扣款：</span>
              </span>
              <span className="font-mono font-black text-amber-900">
                NT$ {availableWithheld.toLocaleString()} 元
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
                    折抵 NT$ {offsetAmount.toLocaleString()} 元
                    {balanceToPay > 0
                      ? `，差額 NT$ ${balanceToPay.toLocaleString()} 元由第三方支付補足`
                      : '（全額折抵，無需額外付款）'}
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
                  <span className="font-bold text-stone-900 block">直接第三方支付全額付費</span>
                  <span className="text-[11px] text-stone-500">
                    保留本問題原懸賞預扣款供後續其他方案採納
                  </span>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Third-Party Payment Method Selector */}
        {balanceToPay > 0 && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-700 block flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-amber-600" />
              <span>選擇第三方支付方式（買賣雙方交易安全保障）：</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['信用卡', 'LINE Pay', 'Apple Pay', 'ATM 轉帳'] as const).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    paymentMethod === method
                      ? 'border-amber-500 bg-amber-50 text-stone-950 font-black ring-2 ring-amber-300 shadow-2xs'
                      : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50 font-medium'
                  }`}
                >
                  <span className="text-xs">{method}</span>
                </button>
              ))}
            </div>
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
            依據《消費者保護法》第 19 條第 2 項及《通訊交易解除權合理例外情事準用原則》，本付費解答屬「非以有形媒介提供之數位內容，一經提供即為完成之線上服務」，經您點擊付款解鎖即視為同意即時交付，排除七日無條件解除權。
          </div>
        </div>

        {isSuccess && (
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-900 text-xs font-bold flex items-center gap-2 border border-emerald-200 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>第三方支付授權成功！方案已解鎖開放閱讀。</span>
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
                ? '第三方支付連線授權中...'
                : isSuccess
                ? '解鎖成功！'
                : balanceToPay > 0
                ? `透過 ${paymentMethod} 付費 NT$ ${balanceToPay.toLocaleString()} 解鎖`
                : '使用預扣額全額折抵解鎖'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );

  if (isFullPage) {
    return <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{content}</div>;
  }

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {content}
    </div>
  );
};

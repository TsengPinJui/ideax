import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Building2,
  ShieldCheck,
  AlertTriangle,
  Coins,
  CheckCircle2,
  X,
  CreditCard,
  UserCheck,
  ArrowRight,
  Info,
} from 'lucide-react';
import { SUBSCRIPTION_PLANS } from '../types';

interface TipPayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToRealName?: () => void;
  onNavigateToBank?: () => void;
  onSuccess?: () => void;
}

export const TipPayoutModal: React.FC<TipPayoutModalProps> = ({
  isOpen,
  onClose,
  onNavigateToRealName,
  onNavigateToBank,
  onSuccess,
}) => {
  const { currentUser, requestTipPayout, subscriptionPlans } = useApp();

  const availablePoints = currentUser?.tipReceivablesPoints || 0;
  const [withdrawPoints, setWithdrawPoints] = useState<number>(availablePoints > 0 ? availablePoints : 500);
  const [customInput, setCustomInput] = useState<string>(availablePoints > 0 ? String(availablePoints) : '500');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [successInfo, setSuccessInfo] = useState<{ netCash: number; bankName: string } | null>(null);

  if (!isOpen) return null;

  const isRealNameVerified = currentUser?.realNameAuthStatus === 'verified';
  const hasBankAccount = Boolean(currentUser?.bankAccount?.accountNumber && currentUser?.bankAccount?.bankName);
  const isEligible = isRealNameVerified && hasBankAccount;

  const currentPlan = subscriptionPlans[currentUser?.subscriptionTier || 'free'] || SUBSCRIPTION_PLANS.free;
  const feeRate = currentPlan.platformFeeRate ?? 0.10; // 預設 10%

  const pointsToWithdraw = parseInt(customInput, 10) || 0;
  const grossCash = pointsToWithdraw; // 1 點 = NT$ 1
  const feeAmount = Math.round(grossCash * feeRate);
  const netCash = Math.max(0, grossCash - feeAmount);

  const handleApply = () => {
    if (!isEligible) {
      setErrorMsg('請先完成實名身分認證並綁定收款帳戶！');
      return;
    }
    if (pointsToWithdraw < 100) {
      setErrorMsg('單次撥款申請最低需滿 100 點！');
      return;
    }
    if (pointsToWithdraw > availablePoints) {
      setErrorMsg(`申請點數超過目前應收打賞餘額 (${availablePoints.toLocaleString()} 點)！`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = requestTipPayout(pointsToWithdraw);
      if (res.success) {
        setIsSuccess(true);
        setSuccessInfo({
          netCash: res.netCash || netCash,
          bankName: currentUser?.bankAccount?.bankName || '指定銀行帳戶',
        });
        if (onSuccess) onSuccess();
        setTimeout(() => {
          setIsSuccess(false);
          onClose();
        }, 3000);
      } else {
        setErrorMsg(res.message || '撥款申請失敗，請稍後重試！');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || '申請過程發生錯誤');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 text-white flex items-center justify-center shadow-xs">
              <Building2 className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight">
                痛點打賞支持金 • 申請撥款
              </h3>
              <p className="text-xs text-emerald-100 font-medium">
                將應收帳款中的讀者打賞點數扣除手續費後匯入指定帳戶
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-emerald-100 transition-colors cursor-pointer"
            title="關閉"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
          {/* Qualifications Status Checker */}
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2.5">
            <h4 className="font-extrabold text-stone-900 text-xs flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>撥款法定審核資格檢驗</span>
            </h4>

            {/* 1. Real name auth status */}
            <div className="p-2.5 rounded-xl bg-white border border-stone-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <UserCheck className={`w-4 h-4 ${isRealNameVerified ? 'text-emerald-600' : 'text-amber-500'}`} />
                <div>
                  <span className="font-bold text-stone-900 block">實名身分核驗 (KYC)</span>
                  <span className="text-[11px] text-stone-500">
                    {isRealNameVerified ? '已通過法定身分實名認證' : '尚未完成身分證實名認證'}
                  </span>
                </div>
              </div>
              {isRealNameVerified ? (
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-black text-[10px]">
                  已認證 ✓
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onNavigateToRealName) onNavigateToRealName();
                  }}
                  className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-[11px] cursor-pointer shadow-2xs"
                >
                  前往認證 ↗
                </button>
              )}
            </div>

            {/* 2. Bank account status */}
            <div className="p-2.5 rounded-xl bg-white border border-stone-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Building2 className={`w-4 h-4 ${hasBankAccount ? 'text-emerald-600' : 'text-amber-500'}`} />
                <div>
                  <span className="font-bold text-stone-900 block">收款銀行帳戶</span>
                  <span className="text-[11px] text-stone-500">
                    {hasBankAccount
                      ? `${currentUser?.bankAccount?.bankName} (•••• ${currentUser?.bankAccount?.accountNumber.slice(-4)})`
                      : '尚未設定綁定收款帳戶'}
                  </span>
                </div>
              </div>
              {hasBankAccount ? (
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-black text-[10px]">
                  已綁定 ✓
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onNavigateToBank) onNavigateToBank();
                  }}
                  className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-[11px] cursor-pointer shadow-2xs"
                >
                  設定帳戶 ↗
                </button>
              )}
            </div>
          </div>

          {/* Amount and Calculation */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-extrabold text-stone-900 text-xs">
                申請撥款打賞點數
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-stone-500 text-[11px]">可提領打賞：</span>
                <strong className="text-amber-800 font-mono">{availablePoints.toLocaleString()} 點</strong>
                <button
                  type="button"
                  onClick={() => setCustomInput(String(availablePoints))}
                  className="text-amber-700 hover:underline font-bold text-[11px] cursor-pointer ml-1"
                >
                  全部提領
                </button>
              </div>
            </div>

            <div className="relative">
              <input
                type="text"
                value={customInput}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setCustomInput(val);
                  setErrorMsg(null);
                }}
                className="w-full px-3 py-2 pr-12 rounded-xl bg-white border border-stone-300 text-sm font-mono font-black text-stone-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                placeholder="輸入申請點數額度（最低 100 點）"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-stone-400">
                點
              </span>
            </div>

            {/* Trial Balance Breakdown */}
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/90 space-y-2">
              <div className="flex items-center justify-between text-stone-700">
                <span>申請點數換算法幣額度</span>
                <span className="font-mono font-bold text-stone-900">
                  NT$ {grossCash.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-stone-700">
                <span className="flex items-center gap-1">
                  <span>平台服務與手續費</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-200 text-amber-950 font-bold">
                    {Math.round(feeRate * 100)}% ({currentPlan.name})
                  </span>
                </span>
                <span className="font-mono font-bold text-rose-600">
                  - NT$ {feeAmount.toLocaleString()}
                </span>
              </div>
              <div className="pt-2 border-t border-amber-200 flex items-center justify-between text-stone-950 font-black">
                <span className="text-xs">實際匯入帳戶金額（非直接點數）</span>
                <span className="text-base sm:text-lg font-mono text-emerald-800 font-black">
                  NT$ {netCash.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-[11px] text-stone-500 leading-relaxed flex items-start gap-2">
              <Info className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
              <span>
                <strong>結算與撥款時程：</strong>打賞點數每週一 00:00 彙整週結；送出申請後，平台將於每週五前依實名資料與銀行帳號進行批次法幣電匯撥款。
              </span>
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Success Message */}
          {isSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 font-extrabold flex items-center gap-2 animate-in zoom-in-95">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <span>🎉 撥款申請已成功送出！</span>
                <p className="text-[11px] text-emerald-700 font-normal mt-0.5">
                  預計撥付 NT$ {successInfo?.netCash.toLocaleString()} 元至 {successInfo?.bankName}。
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between gap-3">
          <div className="text-xs">
            <span className="text-stone-500 block">實撥現金入帳</span>
            <span className="font-black text-emerald-700 font-mono text-base">
              NT$ {netCash.toLocaleString()}
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
              onClick={handleApply}
              disabled={isSubmitting || !isEligible || pointsToWithdraw < 100 || pointsToWithdraw > availablePoints || isSuccess}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              <Building2 className="w-4 h-4" />
              <span>{isSubmitting ? '送出中...' : '確認申請撥款'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

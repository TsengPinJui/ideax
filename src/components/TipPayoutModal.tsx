import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Building2,
  ShieldCheck,
  AlertTriangle,
  Coins,
  Award,
  Sparkles,
  CheckCircle2,
  X,
  UserCheck,
  Info,
} from 'lucide-react';
import { SUBSCRIPTION_PLANS, Transaction } from '../types';

export type PayoutMode = 'bounty' | 'tips' | 'combined';

interface TipPayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: PayoutMode;
  onNavigateToRealName?: () => void;
  onNavigateToBank?: () => void;
  onSuccess?: () => void;
}

export const TipPayoutModal: React.FC<TipPayoutModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'combined',
  onNavigateToRealName,
  onNavigateToBank,
  onSuccess,
}) => {
  const { currentUser, setCurrentUser, setAvailableUsers, setTransactions, addNotification, subscriptionPlans } = useApp();

  const [payoutMode, setPayoutMode] = useState<PayoutMode>(initialMode);

  useEffect(() => {
    if (initialMode) {
      setPayoutMode(initialMode);
    }
  }, [initialMode, isOpen]);

  const bountyReceivables = Math.max(0, currentUser?.withheldPoints || 0);
  const tipReceivables = Math.max(0, currentUser?.tipReceivablesPoints || 0);

  // 當前模式下可提領總點數
  const maxAvailablePoints =
    payoutMode === 'bounty'
      ? bountyReceivables
      : payoutMode === 'tips'
      ? tipReceivables
      : bountyReceivables + tipReceivables;

  const [customInput, setCustomInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [successInfo, setSuccessInfo] = useState<{ netCash: number; bankName: string; modeName: string } | null>(null);

  useEffect(() => {
    if (maxAvailablePoints > 0) {
      setCustomInput(String(maxAvailablePoints));
    } else {
      setCustomInput('0');
    }
    setErrorMsg(null);
  }, [payoutMode, maxAvailablePoints]);

  if (!isOpen) return null;

  const isRealNameVerified = currentUser?.realNameAuthStatus === 'verified';
  const hasBankAccount = Boolean(currentUser?.bankAccount?.accountNumber && currentUser?.bankAccount?.bankName);
  const isEligible = isRealNameVerified && hasBankAccount;

  const currentPlan = subscriptionPlans[currentUser?.subscriptionTier || 'free'] || SUBSCRIPTION_PLANS.free;
  const feeRate = currentPlan.platformFeeRate ?? 0.1; // 依會員方案優惠減免

  const pointsToWithdraw = parseInt(customInput, 10) || 0;
  const grossCash = pointsToWithdraw; // 1 點 = NT$ 1 基準折算法幣
  const feeAmount = Math.round(grossCash * feeRate);
  const netCash = Math.max(0, grossCash - feeAmount);

  const modeTitle =
    payoutMode === 'bounty'
      ? '懸賞撥款'
      : payoutMode === 'tips'
      ? '打賞撥款'
      : '合併撥款';

  const handleApply = () => {
    if (!isEligible) {
      setErrorMsg('請先完成實名身分核驗 (KYC) 並綁定收款銀行帳戶！');
      return;
    }
    if (pointsToWithdraw < 100) {
      setErrorMsg('單次撥款申請最低門檻需滿 100 點！');
      return;
    }
    if (pointsToWithdraw > maxAvailablePoints) {
      setErrorMsg(`申請點數 (${pointsToWithdraw.toLocaleString()}) 超過目前可申請餘額 (${maxAvailablePoints.toLocaleString()} 點)！`);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const bankSnapshot = `${currentUser.bankAccount?.bankName || '指定銀行'} (•••• ${currentUser.bankAccount?.accountNumber?.slice(-4) || '帳戶'})`;

      // 計算從懸賞與打賞中各扣減多少點數
      let deductedBounty = 0;
      let deductedTips = 0;

      if (payoutMode === 'bounty') {
        deductedBounty = pointsToWithdraw;
      } else if (payoutMode === 'tips') {
        deductedTips = pointsToWithdraw;
      } else {
        // 合併模式：優先從懸賞扣，不足再從打賞扣
        deductedBounty = Math.min(bountyReceivables, pointsToWithdraw);
        deductedTips = Math.max(0, pointsToWithdraw - deductedBounty);
      }

      const newWithheld = Math.max(0, bountyReceivables - deductedBounty);
      const newTipReceivables = Math.max(0, tipReceivables - deductedTips);

      const updatedUser = {
        ...currentUser,
        withheldPoints: newWithheld,
        tipReceivablesPoints: newTipReceivables,
        totalPaidOut: (currentUser.totalPaidOut || 0) + netCash,
      };

      setCurrentUser(updatedUser);
      try {
        localStorage.setItem('ideax_user', JSON.stringify(updatedUser));
      } catch {}
      setAvailableUsers((prev) => prev.map((u) => (u.id === currentUser.id ? updatedUser : u)));

      // 建立撥款交易紀錄 (項目明確歸類為：打賞撥款 / 懸賞撥款 / 合併撥款)
      const payoutTxType =
        payoutMode === 'bounty'
          ? '懸賞撥款'
          : payoutMode === 'tips'
          ? '打賞撥款'
          : '合併撥款';

      const payoutTx: Transaction = {
        id: `tx-payout-${Date.now()}`,
        type: payoutTxType,
        amount: grossCash,
        platformFee: feeAmount,
        feeRate,
        netAmount: netCash,
        paymentMethod: '銀行匯款',
        payoutStatus: '處理中',
        bankAccountSnapshot: bankSnapshot,
        fromUserName: 'IdeaX 財務結算中心',
        toUserName: currentUser.name,
        toUserId: currentUser.id,
        status: '處理中',
        createdAt: new Date().toISOString(),
        note: `【${modeTitle}申請】申請點數 ${pointsToWithdraw.toLocaleString()} 點（懸賞: ${deductedBounty.toLocaleString()} 點、打賞: ${deductedTips.toLocaleString()} 點），換算 NT$ ${grossCash.toLocaleString()}，依「${currentPlan.name}」扣除服務費 NT$ ${feeAmount.toLocaleString()}，預計匯入 NT$ ${netCash.toLocaleString()} 至 ${bankSnapshot}。統一於週一 00:00 結算，週三前匯出。`,
      };

      setTransactions((prev) => [payoutTx, ...prev]);

      // 發送系統通知
      addNotification({
        userId: currentUser.id,
        category: 'personal',
        title: `💰 ${modeTitle}申請已受理`,
        message: `您已成功申請【${modeTitle}】${pointsToWithdraw.toLocaleString()} 點！扣除手續費後預計實撥 NT$ ${netCash.toLocaleString()} 元。統一每週一 00:00 結算，週三統一匯入您的綁定銀行帳戶。`,
        type: 'system',
      });

      setIsSuccess(true);
      setSuccessInfo({
        netCash,
        bankName: bankSnapshot,
        modeName: modeTitle,
      });

      if (onSuccess) onSuccess();

      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 2500);
    } catch (err: any) {
      setErrorMsg(err?.message || '申請撥款失敗，請稍後重試！');
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
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">收益撥款申請</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-emerald-100 border border-white/30">
                  每週結算一次
                </span>
              </div>
              <p className="text-xs text-emerald-100 font-medium">
                支援分開撥款與合併撥款，統一每週三匯入指定帳戶
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

        {/* 撥款模式切換器 (分開撥款 vs 合併撥款) */}
        <div className="p-3 bg-stone-50 border-b border-stone-200 flex items-center justify-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setPayoutMode('bounty')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              payoutMode === 'bounty'
                ? 'bg-amber-500 text-stone-950 shadow-xs'
                : 'text-stone-600 hover:text-stone-900 bg-white border border-stone-200'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>僅懸賞撥款</span>
            <span className="text-[10px] font-mono opacity-80">({bountyReceivables.toLocaleString()})</span>
          </button>

          <button
            type="button"
            onClick={() => setPayoutMode('tips')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              payoutMode === 'tips'
                ? 'bg-amber-500 text-stone-950 shadow-xs'
                : 'text-stone-600 hover:text-stone-900 bg-white border border-stone-200'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>僅打賞撥款</span>
            <span className="text-[10px] font-mono opacity-80">({tipReceivables.toLocaleString()})</span>
          </button>

          <button
            type="button"
            onClick={() => setPayoutMode('combined')}
            className={`px-3.5 py-1.5 rounded-xl font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              payoutMode === 'combined'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs'
                : 'text-stone-700 hover:text-stone-900 bg-white border border-stone-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>⚡ 合併撥款</span>
            <span className="text-[10px] font-mono opacity-90">({(bountyReceivables + tipReceivables).toLocaleString()})</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {/* Qualifications Status Checker (統一資格檢驗) */}
          <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
            <h4 className="font-extrabold text-stone-900 text-xs flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>撥款法定資格檢驗</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-xl bg-white border border-stone-200 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <UserCheck className={`w-3.5 h-3.5 ${isRealNameVerified ? 'text-emerald-600' : 'text-amber-500'}`} />
                  <span className="font-bold text-stone-800">實名身分 (KYC)</span>
                </div>
                {isRealNameVerified ? (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">已認證 ✓</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      if (onNavigateToRealName) onNavigateToRealName();
                    }}
                    className="text-[10px] font-bold text-amber-900 bg-amber-200 px-2 py-0.5 rounded-md hover:bg-amber-300 cursor-pointer"
                  >
                    前往認證 ↗
                  </button>
                )}
              </div>

              <div className="p-2 rounded-xl bg-white border border-stone-200 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 truncate">
                  <Building2 className={`w-3.5 h-3.5 ${hasBankAccount ? 'text-emerald-600' : 'text-amber-500'}`} />
                  <span className="font-bold text-stone-800 truncate">收款銀行帳戶</span>
                </div>
                {hasBankAccount ? (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md shrink-0">已綁定 ✓</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      if (onNavigateToBank) onNavigateToBank();
                    }}
                    className="text-[10px] font-bold text-amber-900 bg-amber-200 px-2 py-0.5 rounded-md hover:bg-amber-300 cursor-pointer shrink-0"
                  >
                    設定帳戶 ↗
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Amount and Calculation */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-extrabold text-stone-900 text-xs">
                申請【{modeTitle}】點數額度
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-stone-500 text-[11px]">可申請餘額：</span>
                <strong className="text-amber-800 font-mono">{maxAvailablePoints.toLocaleString()} 點</strong>
                <button
                  type="button"
                  onClick={() => setCustomInput(String(maxAvailablePoints))}
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
                placeholder="輸入申請點數額度（最低滿 100 點）"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-stone-400">
                點
              </span>
            </div>

            {/* Trial Balance Breakdown */}
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/90 space-y-2">
              <div className="flex items-center justify-between text-stone-700">
                <span>申請點數折算法幣額度</span>
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
                <span className="text-xs">實際匯入帳戶金額</span>
                <span className="text-base sm:text-lg font-mono text-emerald-800 font-black">
                  NT$ {netCash.toLocaleString()}
                </span>
              </div>
            </div>

            {/* 統一時程說明 */}
            <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-[11px] text-stone-500 leading-relaxed flex items-start gap-2">
              <Info className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
              <span>
                <strong>統一結算時程：</strong>全站一律每週一 00:00 統一結算，每週三由平台財務中心統一匯出至綁定銀行帳戶。
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
                <span>🎉 {successInfo?.modeName}申請已成功送出！</span>
                <p className="text-[11px] text-emerald-700 font-normal mt-0.5">
                  預計撥付 NT$ {successInfo?.netCash.toLocaleString()} 元至 {successInfo?.bankName}（統一週三匯入）。
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between gap-3">
          <div className="text-xs">
            <span className="text-stone-500 block">實撥金額 (NT$)</span>
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
              disabled={isSubmitting || !isEligible || pointsToWithdraw < 100 || pointsToWithdraw > maxAvailablePoints || isSuccess}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              <Building2 className="w-4 h-4" />
              <span>{isSubmitting ? '送出中...' : `確認${modeTitle}`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

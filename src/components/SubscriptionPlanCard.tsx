import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { SubscriptionTier, SubscriptionPlan, SUBSCRIPTION_PLANS } from '../types';
import {
  Crown,
  Calendar,
  Percent,
  Check,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  Sparkles,
  CreditCard,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  ArrowLeft,
} from 'lucide-react';

export const SubscriptionPlanCard: React.FC = () => {
  const { currentUser, subscribePlan, subscriptionPlans, commissionRate, openAboutModal } = useApp();

  const currentTier: SubscriptionTier = currentUser.subscriptionTier || 'free';
  const currentPlan = subscriptionPlans[currentTier] || SUBSCRIPTION_PLANS[currentTier as keyof typeof SUBSCRIPTION_PLANS] || SUBSCRIPTION_PLANS.free;

  // 動態獲取全站所有方案清單（排除重複的 pro/expert 別名）
  const activePlanList: SubscriptionPlan[] = Object.keys(subscriptionPlans)
    .filter((k) => k !== 'pro' || !subscriptionPlans.expert)
    .map((k) => subscriptionPlans[k as SubscriptionTier])
    .filter(Boolean);

  // 更改方案選取狀態 (預設選中已存在的第一個付費方案或目前方案)
  const defaultTargetTier = currentTier === 'free' 
    ? (subscriptionPlans.expert ? 'expert' : subscriptionPlans.pro ? 'pro' : Object.keys(subscriptionPlans)[1] || 'free')
    : currentTier;

  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>(defaultTargetTier as SubscriptionTier);
  const [selectedCycle, setSelectedCycle] = useState<'monthly' | 'semi_annual' | 'annual'>('monthly');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'信用卡' | 'LINE Pay' | 'Apple Pay' | 'ATM 虛擬帳號'>('信用卡');

  // 付款確認頁面狀態
  const [isPaymentStep, setIsPaymentStep] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  // 取消訂閱二次確認彈窗
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);

  // 條款勾選確認狀態 (首次/更改訂閱需確認一次)
  const [agreeSubscriptionTerms, setAgreeSubscriptionTerms] = useState(true);

  // 當選擇的方案切換時，自動同步對應的第一個計費週期
  const handleSelectTierChange = (tier: SubscriptionTier) => {
    setSelectedTier(tier);
    const plan = subscriptionPlans[tier] || SUBSCRIPTION_PLANS[tier as keyof typeof SUBSCRIPTION_PLANS];
    if (plan?.billingCycles && plan.billingCycles.length > 0) {
      setSelectedCycle(plan.billingCycles[0].cycle);
    }
  };

  // 取得選中方案的計費週期物件
  const targetPlan = subscriptionPlans[selectedTier] || SUBSCRIPTION_PLANS[selectedTier as keyof typeof SUBSCRIPTION_PLANS] || currentPlan;
  const targetCycleObj =
    targetPlan?.billingCycles?.find((c) => c.cycle === selectedCycle) ||
    targetPlan?.billingCycles?.[0] ||
    { cycle: 'monthly', price: targetPlan?.monthlyPrice || 0, label: '月繳', durationMonths: 1 };

  // 方案到期日顯示
  const expiryDisplay = currentUser.subscriptionExpiresAt
    ? currentUser.subscriptionExpiresAt
    : currentTier !== 'free'
    ? '2026-10-31'
    : '一般會員無到期日限制';

  // 全站當前基準抽成百分比 (隨後台即時動態連動)
  const baseRatePercent = Math.round((commissionRate || 0.10) * 100);

  // 計算指定方案之即時動態費率與實收比率
  const getDynamicPlanRate = (plan: SubscriptionPlan) => {
    const rebate = plan.rebatePercent ?? 0;
    const effectiveFeePercent = baseRatePercent - rebate;
    const sellerPayoutPercent = 100 - effectiveFeePercent;

    return {
      effectiveFeePercent,
      sellerPayoutPercent,
      rebate,
    };
  };

  // 執行付款並開通/更改方案
  const handleConfirmPayment = () => {
    setIsProcessing(true);
    const res = subscribePlan(selectedTier, selectedCycle, selectedPaymentMethod);

    if (res.success) {
      setActionMsg({
        text: `🎉 成功更改為「${targetPlan.name}」！付款方式：${selectedPaymentMethod}，已即時開通並享有專屬服務費減免與特權！`,
        isError: false,
      });
      setIsPaymentStep(false);
    } else {
      setActionMsg({
        text: res.message || '更改方案處理失敗，請重試。',
        isError: true,
      });
    }

    setIsProcessing(false);
    setTimeout(() => setActionMsg(null), 6000);
  };

  // 確認取消訂閱
  const handleConfirmCancel = () => {
    setIsProcessing(true);
    subscribePlan('free', 'monthly', '無');
    setIsCancelConfirmOpen(false);
    setActionMsg({
      text: '已成功取消會員訂閱，您的身分已恢復為一般會員（標準服務費 10%）。您可以隨時重新升級！',
      isError: false,
    });
    setIsProcessing(false);
    setTimeout(() => setActionMsg(null), 5000);
  };

  return (
    <div className="space-y-5">
      {/* 訊息提示通知 */}
      {actionMsg && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 border animate-in fade-in duration-150 ${
            actionMsg.isError
              ? 'bg-rose-50 text-rose-900 border-rose-200'
              : 'bg-emerald-50 text-emerald-900 border-emerald-200'
          }`}
        >
          {actionMsg.isError ? (
            <HelpCircle className="w-4 h-4 text-rose-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
          <span>{actionMsg.text}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. 最上面：顯示「當前方案」和「到期日」 */}
      {/* ========================================================================= */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-stone-950 font-black flex items-center justify-center shrink-0 shadow-2xs">
              <Crown className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-stone-500">目前會員方案</span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${currentPlan.badgeClass}`}>
                  {currentPlan.name}
                </span>
              </div>
              <h3 className="font-black text-base text-stone-900 mt-0.5">
                {currentPlan.name}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-200/80 text-xs">
            <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="text-stone-500 font-bold">方案到期日：</span>
            <strong className="text-stone-900 font-mono font-black">{expiryDisplay}</strong>
          </div>
        </div>

        {/* 當前方案待遇指標 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
          {(() => {
            const curRate = getDynamicPlanRate(currentPlan);
            return (
              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                    <Percent className="w-3 h-3 text-amber-700" />
                    <span>享有服務費率</span>
                  </span>
                  <div className="text-sm font-black text-amber-950 font-mono mt-0.5">
                    {curRate.effectiveFeePercent <= 0
                      ? curRate.effectiveFeePercent < 0
                        ? `免服務費 + 另獲 ${Math.abs(curRate.effectiveFeePercent)}% 紅利`
                        : '0% 免服務費'
                      : `抽成 ${curRate.effectiveFeePercent}%`}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-amber-800 font-medium block">解答者實收</span>
                  <span className="text-sm font-black text-amber-950 font-mono">{curRate.sellerPayoutPercent}%</span>
                </div>
              </div>
            );
          })()}

          <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-stone-500 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-stone-400" />
                <span>帳號與身分狀態</span>
              </span>
              <div className="text-xs font-black text-stone-900 mt-0.5">
                {currentTier === 'free' ? '一般用戶（免月費基礎帳號）' : '訂閱會員（已開通付費方案）'}
              </div>
            </div>
            <span className="text-[10px] text-stone-500 font-medium">
              {currentTier === 'free' ? '可依需求隨時訂閱升級' : '可隨時變更或取消'}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. 再下面：「更改方案」用下拉式選單選擇，並且點選確認更改後進入付款確認頁面 */}
      {/* ========================================================================= */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-3.5">
        <div className="border-b border-stone-100 pb-2.5">
          <h4 className="font-black text-xs sm:text-sm text-stone-900 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>更改方案</span>
          </h4>
          <p className="text-[11px] text-stone-500 mt-0.5">
            由下拉選單選取欲變更的方案與週期，點選「確認更改」後進入付款確認頁面。
          </p>
        </div>

        {!isPaymentStep ? (
          /* 下拉選擇模式 */
          <div className="space-y-3 pt-0.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 下拉選單 1：選擇目標會員方案 */}
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  選擇目標方案 *
                </label>
                <select
                  value={selectedTier}
                  onChange={(e) => handleSelectTierChange(e.target.value as SubscriptionTier)}
                  className="w-full px-3 py-2 bg-stone-50 hover:bg-stone-100 focus:bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-xs font-bold text-stone-900 outline-none cursor-pointer transition-colors shadow-2xs"
                >
                  {activePlanList.map((p) => {
                    const r = getDynamicPlanRate(p);
                    const feeDesc = r.effectiveFeePercent <= 0 
                      ? (r.effectiveFeePercent < 0 ? `免服務費 + 另獲 ${Math.abs(r.effectiveFeePercent)}% BONUS` : '免服務費')
                      : `抽成 ${r.effectiveFeePercent}%`;
                    return (
                      <option key={p.id} value={p.id}>
                        {p.name}（{p.pricingText || `NT$ ${p.monthlyPrice}/月`}・{feeDesc}・實收 {r.sellerPayoutPercent}%）
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* 下拉選單 2：選擇計費週期 */}
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  選擇計費週期 *
                </label>
                {targetPlan?.billingCycles && targetPlan.billingCycles.length > 1 ? (
                  <select
                    value={selectedCycle}
                    onChange={(e) => setSelectedCycle(e.target.value as any)}
                    className="w-full px-3 py-2 bg-stone-50 hover:bg-stone-100 focus:bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-xs font-bold text-stone-900 outline-none cursor-pointer transition-colors shadow-2xs"
                  >
                    {targetPlan.billingCycles.map((c) => (
                      <option key={c.cycle} value={c.cycle}>
                        {c.label} {c.savingsText ? `(${c.savingsText})` : ''} - NT$ {(c.price || 0).toLocaleString()}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="px-3 py-2 bg-stone-100 border border-stone-200 rounded-xl text-xs font-bold text-stone-700">
                    {targetCycleObj.label} - NT$ {(targetCycleObj.price || 0).toLocaleString()}
                  </div>
                )}
              </div>
            </div>

            {/* 即時預覽卡與「確認更改」按鈕 */}
            {(() => {
              const targetRate = getDynamicPlanRate(targetPlan);
              const feeBadgeText = targetRate.effectiveFeePercent <= 0
                ? (targetRate.effectiveFeePercent < 0 ? `免服務費 + 另獲 ${Math.abs(targetRate.effectiveFeePercent)}% 紅利` : '免服務費')
                : `抽成 ${targetRate.effectiveFeePercent}%`;

              return (
                <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-xs text-amber-950">
                        預計變更為：{targetPlan.name}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${targetPlan.badgeClass}`}>
                        {feeBadgeText}
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-900/80 mt-0.5 font-bold">
                      本次費用 <strong>NT$ {(targetCycleObj.price || 0).toLocaleString()}</strong>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsPaymentStep(true)}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 font-black text-xs shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer shrink-0"
                  >
                    <span>確認更改</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })()}
          </div>
        ) : (
          /* 付款確認頁面 */
          <div className="p-3.5 sm:p-4 rounded-xl bg-stone-50 border-2 border-amber-400 shadow-xs space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-stone-200 pb-2">
              <div className="flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-amber-600" />
                <h5 className="font-black text-xs sm:text-sm text-stone-900">付款確認頁面</h5>
              </div>
              <button
                type="button"
                onClick={() => setIsPaymentStep(false)}
                className="text-xs text-stone-500 hover:text-stone-800 flex items-center gap-1 cursor-pointer font-bold"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>返回修改</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 rounded-lg bg-white border border-stone-200 space-y-1">
                <span className="text-stone-500 font-bold block text-[10px]">訂閱方案與週期</span>
                <p className="text-xs font-black text-stone-900">
                  {targetPlan.name}（{targetCycleObj.label}）
                </p>
                <p className="text-emerald-700 font-bold text-[11px]">
                  享有待遇：{getDynamicPlanRate(targetPlan).effectiveFeePercent <= 0 ? '免服務費' : `抽成 ${getDynamicPlanRate(targetPlan).effectiveFeePercent}%`}（實收 {getDynamicPlanRate(targetPlan).sellerPayoutPercent}%）
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-stone-200 space-y-1">
                <span className="text-stone-500 font-bold block text-[10px]">本期應付總金額</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xs text-stone-500 font-bold">NT$</span>
                  <span className="text-lg font-black text-stone-900 font-mono">
                    {(targetCycleObj.price || 0).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-stone-400">元</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-semibold">
                  <ShieldCheck className="w-3 h-3" />
                  <span>第三方安全加密託管扣款</span>
                </div>
              </div>
            </div>

            {/* 付款方式選擇 */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-stone-700 block">請選擇付款方式：</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {(['信用卡', 'LINE Pay', 'Apple Pay', 'ATM 虛擬帳號'] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setSelectedPaymentMethod(method)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer text-center ${
                      selectedPaymentMethod === method
                        ? 'bg-amber-500 text-stone-950 border-amber-500 font-black shadow-2xs'
                        : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            {/* 定型化契約與自動續約法律合規提醒與勾選 */}
            <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/90 text-xs text-stone-700 space-y-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeSubscriptionTerms}
                  onChange={(e) => setAgreeSubscriptionTerms(e.target.checked)}
                  className="w-4 h-4 accent-amber-600 rounded mt-0.5 shrink-0 cursor-pointer"
                />
                <span className="text-[11px] leading-relaxed text-stone-700">
                  我已詳閱並同意
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      openAboutModal('recharge_subscription_terms');
                    }}
                    className="text-amber-800 hover:text-amber-900 underline font-black mx-1 cursor-pointer inline-flex items-center"
                  >
                    《點數儲值與會員方案訂閱服務條款》
                  </button>
                  。我理解本方案為<strong>定期定額自動續訂</strong>，授權系統於每期期滿前自動展延扣款；依消保法規定，本數位特權服務開通即享專屬費率與功能，開通後不適用七日無條件退款。您可隨時於個人中心取消下期續約。
                </span>
              </label>
            </div>

            {/* 按鈕組 */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setIsPaymentStep(false)}
                className="px-3 py-1.5 rounded-lg border border-stone-300 text-stone-600 hover:bg-stone-100 text-xs font-bold cursor-pointer"
              >
                取消並返回
              </button>

              <button
                type="button"
                onClick={handleConfirmPayment}
                disabled={isProcessing || !agreeSubscriptionTerms}
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 text-xs font-black shadow-xs transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>確認扣款 NT$ {(targetCycleObj.price || 0).toLocaleString()} 並變更方案</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. 再下面：直式「解答者會員方案對比」表格（強調半價、免服務費、另獲2%紅利，附功能對比） */}
      {/* ========================================================================= */}
      <div className="p-4 sm:p-6 rounded-3xl bg-white border border-stone-200 shadow-xs space-y-4">
        {/* 頂部標題與到期日期限標籤 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-stone-100 pb-3.5">
          <div>
            <h4 className="text-base sm:text-lg font-black text-stone-900 flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-600" />
              <span>解答者會員方案對比</span>
            </h4>
            <p className="text-xs text-stone-500 mt-0.5">
              第三方支付在平台確認採納後自動拆款撥付，服務費由賣家吸收
            </p>
          </div>

          {/* 右上角：目前方案期限 */}
          <div className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-amber-50 text-amber-950 border border-amber-200/80 text-xs font-bold flex items-center gap-1.5 shadow-2xs shrink-0">
            <Calendar className="w-3.5 h-3.5 text-amber-600" />
            <span>目前方案期限：<strong className="font-mono text-stone-900 font-black">{expiryDisplay}</strong></span>
          </div>
        </div>

        {/* 直式對比表格 (Vertical Column Table: 各方案為縱列，項目/維度與功能對比為橫列) */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[640px]">
            <thead>
              <tr className="border-b-2 border-stone-200 bg-stone-50/90 text-stone-900 font-black">
                <th className="py-3 px-3.5 w-28 sm:w-32 text-stone-500 font-bold">項目/方案</th>
                {activePlanList.map((plan) => {
                  const isCurrent =
                    currentTier === plan.id ||
                    ((currentTier === 'pro' || currentTier === 'expert') && (plan.id === 'pro' || plan.id === 'expert'));

                  return (
                    <th
                      key={plan.id}
                      className={`py-3 px-3.5 text-center transition-colors ${
                        plan.id === 'master'
                          ? 'bg-amber-50/70 text-amber-950 border-x border-amber-200'
                          : plan.id === 'authority'
                          ? 'bg-purple-50/60 text-purple-950 border-x border-purple-100'
                          : plan.id === 'expert' || plan.id === 'pro'
                          ? 'bg-blue-50/60 text-blue-950 border-x border-blue-100'
                          : 'text-stone-800'
                      }`}
                    >
                      <div className="flex flex-col items-center justify-center gap-1">
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-black">{plan.name}</span>
                          {plan.id === 'master' && <Crown className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />}
                        </div>
                        {isCurrent && (
                          <span className="bg-amber-500 text-stone-950 text-[10px] font-black px-2 py-0.5 rounded-full shadow-2xs animate-pulse">
                            目前方案
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-xs">
              {/* 橫列 1: 訂閱費用 */}
              <tr className="hover:bg-stone-50/60 transition-colors">
                <td className="py-3.5 px-3.5 font-bold text-stone-600 bg-stone-50/40">
                  訂閱費用
                </td>
                {activePlanList.map((plan) => {
                  const isFree = plan.id === 'free';
                  return (
                    <td
                      key={plan.id}
                      className={`py-3.5 px-3.5 text-center font-mono font-bold text-stone-900 ${
                        plan.id === 'master'
                          ? 'bg-amber-50/30'
                          : plan.id === 'authority'
                          ? 'bg-purple-50/20'
                          : plan.id === 'expert' || plan.id === 'pro'
                          ? 'bg-blue-50/20'
                          : ''
                      }`}
                    >
                      {isFree ? '免費使用' : plan.pricingText || `NT$ ${plan.monthlyPrice}/月`}
                    </td>
                  );
                })}
              </tr>

              {/* 橫列 2: 平台服務費率 (達人 8%、權威 5%、大師 0%) */}
              <tr className="hover:bg-stone-50/60 transition-colors">
                <td className="py-3.5 px-3.5 font-bold text-stone-600 bg-stone-50/40">
                  平台服務費率
                </td>
                {activePlanList.map((plan) => {
                  const rate = getDynamicPlanRate(plan);
                  const isMaster = plan.id === 'master';
                  const isAuth = plan.id === 'authority';
                  const isPro = plan.id === 'expert' || plan.id === 'pro';
                  const isFree = plan.id === 'free';

                  return (
                    <td
                      key={plan.id}
                      className={`py-3.5 px-3.5 text-center ${
                        isMaster
                          ? 'bg-amber-50/30'
                          : isAuth
                          ? 'bg-purple-50/20'
                          : isPro
                          ? 'bg-blue-50/20'
                          : ''
                      }`}
                    >
                      {isFree ? (
                        <span className="font-bold text-stone-800">
                          標準 <strong className="text-stone-950 font-black">{baseRatePercent}%</strong> 服務費
                        </span>
                      ) : isPro ? (
                        <div className="space-y-0.5">
                          <div className="font-bold text-blue-950">
                            <strong className="text-blue-950 font-black text-base font-mono">8%</strong>
                          </div>
                          <span className="inline-block font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 text-[11px] shadow-2xs">
                            僅收 8%
                          </span>
                        </div>
                      ) : isAuth ? (
                        <div className="space-y-0.5">
                          <div className="font-bold text-purple-950">
                            服務費 <strong className="text-purple-950 font-black">5%</strong>
                          </div>
                          <span className="inline-block font-black text-purple-800 bg-purple-100 px-2.5 py-0.5 rounded-full border border-purple-300 text-[11px] shadow-2xs" title="比達人方案再降 3% 服務費">
                            比達人更省 3%（僅收 5%）
                          </span>
                        </div>
                      ) : isMaster ? (
                        <div className="space-y-1">
                          <div className="flex items-center justify-center gap-1 flex-wrap">
                            <span className="font-black text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300 text-[11px]">
                              0% 免服務費
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="font-bold text-stone-800">
                          {rate.effectiveFeePercent <= 0 ? (
                            <strong className="text-emerald-700 font-black">免服務費 (0%)</strong>
                          ) : (
                            `服務費 ${rate.effectiveFeePercent}%`
                          )}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* 橫列 3: 解答者實收撥款 */}
              <tr className="hover:bg-stone-50/60 transition-colors">
                <td className="py-3.5 px-3.5 font-bold text-stone-600 bg-stone-50/40">
                  解答者實收撥款
                </td>
                {activePlanList.map((plan) => {
                  const rate = getDynamicPlanRate(plan);
                  const isMaster = plan.id === 'master';

                  return (
                    <td
                      key={plan.id}
                      className={`py-3.5 px-3.5 text-center ${
                        isMaster
                          ? 'bg-amber-50/30'
                          : plan.id === 'authority'
                          ? 'bg-purple-50/20'
                          : plan.id === 'expert' || plan.id === 'pro'
                          ? 'bg-blue-50/20'
                          : ''
                      }`}
                    >
                      <div className="flex flex-col items-center justify-center">
                        <span className="text-base font-black font-mono text-stone-900">
                          {rate.sellerPayoutPercent}%
                        </span>
                        {isMaster && (
                          <span className="text-[10px] font-black text-amber-950 bg-amber-200/90 px-1.5 py-0.2 rounded mt-0.5">
                            全額 100% 入帳
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* 橫列 4+: 分開各項獨立特權功能 (不同功能分開獨立成列，特權功能名稱粗體字) */}
              {[
                {
                  id: 'ask_answer',
                  name: '全站發問與解答提案',
                  renderCell: (plan: SubscriptionPlan) => (
                    <span className="font-bold text-emerald-700 flex items-center justify-center gap-1">
                      <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                      <span>支援</span>
                    </span>
                  ),
                },
                {
                  id: 'ai_analysis',
                  name: 'AI 初步問題分析報告',
                  renderCell: (plan: SubscriptionPlan) => {
                    const hasIt =
                      plan.id !== 'free' &&
                      (['pro', 'expert', 'authority', 'master'].includes(plan.id) ||
                        plan.benefits?.some((b) => b.includes('AI') && (b.includes('分析') || b.includes('報告'))));
                    if (!hasIt) return <span className="text-stone-300 font-bold">—</span>;
                    const isPro = plan.id === 'pro' || plan.id === 'expert';
                    return (
                      <span
                        className={`inline-block font-bold px-2 py-0.5 rounded-md text-[11px] ${
                          plan.id === 'master'
                            ? 'text-amber-950 bg-amber-200/80'
                            : plan.id === 'authority'
                            ? 'text-purple-900 bg-purple-100/70 font-black'
                            : 'text-blue-900 bg-blue-100/70'
                        }`}
                      >
                        {isPro
                          ? '免費查看 50 次'
                          : plan.id === 'authority'
                          ? '✨ 比達人升級無限次＋下載報告'
                          : '免費無限次查看及下載報告'}
                      </span>
                    );
                  },
                },
                {
                  id: 'ai_structure',
                  name: 'AI 提案架構整理',
                  renderCell: (plan: SubscriptionPlan) => {
                    const hasIt =
                      plan.id !== 'free' &&
                      (['pro', 'expert', 'authority', 'master'].includes(plan.id) ||
                        plan.benefits?.some((b) => b.includes('架構')));
                    if (!hasIt) return <span className="text-stone-300 font-bold">—</span>;
                    return (
                      <span
                        className={`inline-block font-bold px-2 py-0.5 rounded-md text-[11px] ${
                          plan.id === 'master'
                            ? 'text-amber-950 bg-amber-200/80'
                            : plan.id === 'authority'
                            ? 'text-purple-900 bg-purple-100/70'
                            : 'text-blue-900 bg-blue-100/70'
                        }`}
                      >
                        一鍵整理 4 層架構
                      </span>
                    );
                  },
                },
                {
                  id: 'commercial_priority',
                  name: '高賞提案優先推薦',
                  renderCell: (plan: SubscriptionPlan) => {
                    const hasIt =
                      ['authority', 'master'].includes(plan.id) ||
                      plan.benefits?.some((b) => b.includes('商業') || b.includes('推薦') || b.includes('高賞'));
                    if (!hasIt) return <span className="text-stone-300 font-bold">—</span>;
                    return (
                      <span
                        className={`inline-block font-bold px-2 py-0.5 rounded-md text-[11px] ${
                          plan.id === 'master'
                            ? 'text-amber-950 bg-amber-200/80'
                            : 'text-purple-900 bg-purple-100/70 font-black'
                        }`}
                      >
                        {plan.id === 'authority' ? '✨ 比達人新增優先推薦曝光' : '優先推薦曝光'}
                      </span>
                    );
                  },
                },
                {
                  id: 'ai_crm',
                  name: 'AI-CRM 主動客戶關係管理',
                  renderCell: (plan: SubscriptionPlan) => {
                    const hasIt =
                      plan.id === 'master' ||
                      plan.benefits?.some((b) => b.includes('CRM') || b.includes('客戶關係') || b.includes('小秘書'));
                    if (!hasIt) return <span className="text-stone-300 font-bold">—</span>;
                    return (
                      <div className="flex flex-col items-center justify-center gap-0.5">
                        <span className="inline-block font-black text-amber-950 bg-gradient-to-r from-amber-300 to-orange-300 px-2 py-0.5 rounded-md text-[11px] shadow-2xs">
                          👑 管理案件小秘書(大師專屬)
                        </span>
                      </div>
                    );
                  },
                },
                {
                  id: 'ai_assistant',
                  name: '24hr AI客服特助',
                  renderCell: (plan: SubscriptionPlan) => {
                    const hasIt =
                      plan.id === 'master' ||
                      plan.benefits?.some((b) => b.includes('特助') || b.includes('客服特助'));
                    if (!hasIt) return <span className="text-stone-300 font-bold">—</span>;
                    return (
                      <div className="flex flex-col items-center justify-center gap-0.5">
                        <span className="inline-block font-black text-amber-950 bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-400 px-2 py-0.5 rounded-md text-[11px] shadow-2xs">
                          🤖 離線代客對談 ＋ 聊天室策略建議
                        </span>
                      </div>
                    );
                  },
                },
              ].map((feat) => (
                <tr key={feat.id} className="hover:bg-stone-50/60 transition-colors">
                  <td className="py-3 px-3.5 bg-stone-50/40 text-stone-900">
                    <strong className="font-black text-stone-900 block">{feat.name}</strong>
                  </td>
                  {activePlanList.map((plan) => {
                    const isMaster = plan.id === 'master';
                    const isAuth = plan.id === 'authority';
                    const isPro = plan.id === 'expert' || plan.id === 'pro';

                    return (
                      <td
                        key={plan.id}
                        className={`py-3 px-3.5 text-center ${
                          isMaster
                            ? 'bg-amber-50/30'
                            : isAuth
                            ? 'bg-purple-50/20'
                            : isPro
                            ? 'bg-blue-50/20'
                            : ''
                        }`}
                      >
                        {feat.renderCell(plan)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 大師方案 BUFF 綜效公式 (+=... 表示) */}
        <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-300/80 flex flex-col sm:flex-row items-center justify-center gap-2 text-xs text-amber-950 font-bold shadow-2xs">
          <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-stone-950 shadow-2xs flex items-center gap-1 shrink-0">
            <Sparkles className="w-3 h-3" />
            <span>大師限定 BUFF 加成</span>
          </span>
          <div className="flex items-center gap-1.5 flex-wrap justify-center text-xs">
            <span className="px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-950 font-black text-[11px]">
              🤖 24hr AI客服特助(大師專屬)
            </span>
            <span className="w-5 h-5 rounded-full bg-amber-400 text-stone-950 font-black text-xs flex items-center justify-center shadow-2xs border border-amber-500/60">
              +
            </span>
            <span className="px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-950 font-black text-[11px]">
              👑 管理案件小秘書(大師專屬)
            </span>
            <span className="font-black text-amber-700 text-sm px-0.5">＝</span>
            <span className="text-amber-950 font-black text-[11px] sm:text-xs bg-white/90 px-2.5 py-0.5 rounded-md border border-amber-300/80 shadow-2xs">
              0% 免服務費全額入帳 ＋ 主動接案轉單飛輪！
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. 再往下：紅色的取消訂閱，確認後才可取消 */}
      {/* ========================================================================= */}
      <div className="p-4 sm:p-5 rounded-3xl bg-rose-50/50 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h5 className="font-black text-xs sm:text-sm text-rose-950 flex items-center gap-1.5">
            <XCircle className="w-4 h-4 text-rose-600" />
            <span>取消會員訂閱</span>
          </h5>
          <p className="text-[11px] text-rose-900/80 mt-0.5">
            若暫時不需要服務費減免與專屬特權，可點選取消訂閱。取消後身分將於到期後降為一般會員。
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCancelConfirmOpen(true)}
          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer shrink-0"
        >
          <XCircle className="w-3.5 h-3.5" />
          <span>取消訂閱</span>
        </button>
      </div>

      {/* 取消訂閱防呆二次確認彈窗 */}
      {isCancelConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-stone-200">
            <div className="flex items-center gap-2.5 text-rose-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h4 className="font-black text-base text-stone-900">確認取消會員訂閱？</h4>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              您目前享有<strong>「{currentPlan.name}」</strong>。確認取消後，您的帳號將於到期日後降為一般會員，第三方交易拆款將恢復為全站基準 {baseRatePercent}% 服務費，且將失去相關特權。
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setIsCancelConfirmOpen(false)}
                className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs font-bold cursor-pointer"
              >
                保留目前方案
              </button>

              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-black shadow-xs transition-all cursor-pointer"
              >
                確認取消訂閱
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

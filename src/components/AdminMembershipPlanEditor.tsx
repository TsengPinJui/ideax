import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { SubscriptionTier, SubscriptionPlan, SUBSCRIPTION_PLANS } from '../types';
import {
  Crown,
  Edit3,
  Save,
  CheckCircle2,
  Users,
  Eye,
  Percent,
  Sparkles,
  Sliders,
  ShieldCheck,
  Check,
  Plus,
  Trash2,
  X,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react';
import { SubscriptionPlanCard } from './SubscriptionPlanCard';

export const AdminMembershipPlanEditor: React.FC = () => {
  const {
    commissionRate,
    setCommissionRate,
    subscriptionPlans,
    updateSubscriptionPlan,
    updateSubscriptionPlanFull,
    addSubscriptionPlan,
    deleteSubscriptionPlan,
    availableUsers,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'commission_and_plans' | 'copy_editor' | 'preview'>('commission_and_plans');
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  // 1. 平台基準抽成比例滑桿狀態 (預設 10%)
  const [sliderRate, setSliderRate] = useState<number>(() => Math.round((commissionRate || 0.10) * 100));

  // 2. 方案價格與減免抽成率本地狀態 (動態支援所有方案)
  const [editablePlans, setEditablePlans] = useState<Record<string, SubscriptionPlan>>(() => {
    return { ...subscriptionPlans };
  });

  // 新增方案彈窗狀態
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanId, setNewPlanId] = useState('');
  const [newPlanMonthlyPrice, setNewPlanMonthlyPrice] = useState(499);
  const [newPlanRebate, setNewPlanRebate] = useState(5);
  const [newPlanTagline, setNewPlanTagline] = useState('');
  const [newPlanBadgeColor, setNewPlanBadgeColor] = useState<'blue' | 'purple' | 'amber' | 'emerald' | 'stone'>('emerald');
  const [newPlanBenefits, setNewPlanBenefits] = useState<string>('全站發問與解答提案\n享專屬平台手續費減免折扣\n第三方安全交易拆款保障');

  // 刪除確認彈窗
  const [deleteTargetPlan, setDeleteTargetPlan] = useState<SubscriptionPlan | null>(null);

  // 儲存抽成/方案設定二次確認彈窗
  const [confirmSaveModal, setConfirmSaveModal] = useState<{
    isOpen: boolean;
    type: 'commission_only' | 'all_plans' | 'copy_only';
    targetRate?: number;
  } | null>(null);

  useEffect(() => {
    setSliderRate(Math.round((commissionRate || 0.10) * 100));
  }, [commissionRate]);

  useEffect(() => {
    setEditablePlans({ ...subscriptionPlans });
  }, [subscriptionPlans]);

  // 計算各方案訂閱人數
  const getSubscriberCount = (tierId: string) => {
    const directCount = availableUsers.filter((u) => u.subscriptionTier === tierId).length;
    if (tierId === 'free') return directCount + 86;
    if (tierId === 'pro' || tierId === 'expert') return directCount + 39;
    if (tierId === 'authority') return directCount + 7;
    if (tierId === 'master') return directCount + 3;
    return directCount;
  };

  const handleFieldChange = (tier: string, field: keyof SubscriptionPlan, val: any) => {
    setEditablePlans((prev) => ({
      ...prev,
      [tier]: {
        ...prev[tier],
        [field]: val,
      },
      ...(tier === 'pro' && prev.expert ? {
        expert: {
          ...prev.expert,
          [field]: val,
        }
      } : {}),
    }));
  };

  const handleSaveCommissionOnly = () => {
    setConfirmSaveModal({
      isOpen: true,
      type: 'commission_only',
      targetRate: sliderRate,
    });
  };

  const handleSaveCommissionAndPlans = () => {
    setConfirmSaveModal({
      isOpen: true,
      type: 'all_plans',
    });
  };

  const handleSaveAllCopy = () => {
    setConfirmSaveModal({
      isOpen: true,
      type: 'copy_only',
    });
  };

  // 執行儲存基準抽成
  const executeSaveCommissionOnly = () => {
    const newBaseRate = sliderRate / 100;
    setCommissionRate(newBaseRate);
    try {
      localStorage.setItem('ideax_mvp_v3_commission', JSON.stringify(newBaseRate));
    } catch (e) {}

    // 自動同步現有各方案之基準費率
    Object.keys(editablePlans).forEach((tierKey) => {
      const plan = editablePlans[tierKey];
      if (plan) {
        updateSubscriptionPlan(tierKey as SubscriptionTier, plan.monthlyPrice || 0, plan.rebatePercent || 0, newBaseRate);
      }
    });

    setFeedbackMsg({
      text: `🎉 平台基準抽成已成功儲存並生效！基準抽成率已更新為 ${sliderRate}%。`,
      isError: false,
    });
    setConfirmSaveModal(null);
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // 執行儲存全站抽成與方案設定
  const executeSaveCommissionAndPlans = () => {
    const newBaseRate = sliderRate / 100;
    setCommissionRate(newBaseRate);
    try {
      localStorage.setItem('ideax_mvp_v3_commission', JSON.stringify(newBaseRate));
    } catch (e) {}

    // 更新各方案
    Object.keys(editablePlans).forEach((tierKey) => {
      const plan = editablePlans[tierKey];
      if (plan) {
        updateSubscriptionPlan(tierKey as SubscriptionTier, plan.monthlyPrice || 0, plan.rebatePercent || 0, newBaseRate);
      }
    });

    setFeedbackMsg({
      text: `🎉 平台抽成與方案價格設定已成功儲存！基準抽成設定為 ${sliderRate}%，全站會員方案費率與價格已即時同步更新！`,
      isError: false,
    });
    setConfirmSaveModal(null);
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const executeSaveAllCopy = () => {
    Object.keys(editablePlans).forEach((tierKey) => {
      if (editablePlans[tierKey]) {
        updateSubscriptionPlanFull(tierKey as SubscriptionTier, editablePlans[tierKey]);
      }
    });
    setFeedbackMsg({
      text: '🎉 已成功儲存全體會員方案特權文案！全站即刻生效。',
      isError: false,
    });
    setConfirmSaveModal(null);
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // 執行新增方案
  const handleCreateNewPlan = (e: React.FormEvent) => {
    e.preventDefault();
    const finalId = newPlanId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '') || `custom_${Date.now()}`;
    if (!newPlanName.trim()) {
      setFeedbackMsg({ text: '請輸入方案名稱', isError: true });
      return;
    }

    const effectiveFee = sliderRate - newPlanRebate;
    const sellerPayout = 100 - effectiveFee;
    const badgeClasses = {
      blue: 'bg-blue-50 text-blue-800 border-blue-200 font-bold',
      purple: 'bg-purple-50 text-purple-900 border-purple-200 font-bold',
      amber: 'bg-amber-100 text-amber-900 border-amber-300 font-black',
      emerald: 'bg-emerald-50 text-emerald-900 border-emerald-300 font-bold',
      stone: 'bg-stone-100 text-stone-700 border-stone-200 font-bold',
    };

    const newPlanObj: SubscriptionPlan = {
      id: finalId as SubscriptionTier,
      name: newPlanName.trim(),
      pricingText: `$${newPlanMonthlyPrice}/月 或 $${newPlanMonthlyPrice * 10}/年`,
      monthlyPrice: Number(newPlanMonthlyPrice) || 0,
      billingCycles: [
        { cycle: 'monthly', price: Number(newPlanMonthlyPrice) || 0, label: `月繳 NT$ ${newPlanMonthlyPrice}/月`, durationMonths: 1 },
        { cycle: 'annual', price: (Number(newPlanMonthlyPrice) || 0) * 10, label: `年繳 NT$ ${(Number(newPlanMonthlyPrice) || 0) * 10}/年`, durationMonths: 12, savingsText: '現省 2 個月' },
      ],
      platformFeeRate: effectiveFee / 100,
      feeDiscountText: effectiveFee <= 0 ? (effectiveFee < 0 ? `免服務費 + 另獲 ${Math.abs(effectiveFee)}% BONUS` : '免服務費 (0%)') : `服務費 -${newPlanRebate}%（實抽 ${effectiveFee}%）`,
      sellerPayoutRate: sellerPayout / 100,
      sellerPayoutText: `${sellerPayout}%`,
      effectiveRateText: `${effectiveFee}%`,
      rebatePercent: Number(newPlanRebate) || 0,
      badgeClass: badgeClasses[newPlanBadgeColor] || badgeClasses.emerald,
      tagline: newPlanTagline.trim() || `專屬自訂特權方案，實質享有 ${effectiveFee}% 服務費率`,
      benefits: newPlanBenefits
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
    };

    const res = addSubscriptionPlan(newPlanObj);
    if (res.success) {
      setFeedbackMsg({ text: `🎉 成功新增自訂方案「${newPlanObj.name}」！`, isError: false });
      setIsAddModalOpen(false);
      setNewPlanName('');
      setNewPlanId('');
      setNewPlanTagline('');
    } else {
      setFeedbackMsg({ text: res.message, isError: true });
    }
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // 執行刪除方案
  const handleConfirmDelete = () => {
    if (!deleteTargetPlan) return;
    const res = deleteSubscriptionPlan(deleteTargetPlan.id);
    if (res.success) {
      setFeedbackMsg({ text: `已成功刪除「${deleteTargetPlan.name}」方案！`, isError: false });
      setDeleteTargetPlan(null);
    } else {
      setFeedbackMsg({ text: res.message, isError: true });
    }
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // 取得展示方案清單（排除重疊的 expert 別名以避免重複）
  const activePlanList = Object.keys(editablePlans)
    .filter((k) => k !== 'pro' || !editablePlans.expert) // 避免 pro 和 expert 同時列出
    .map((k) => editablePlans[k])
    .filter(Boolean);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 訊息反饋提示 */}
      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 border ${
            feedbackMsg.isError
              ? 'bg-rose-50 text-rose-900 border-rose-200'
              : 'bg-emerald-50 text-emerald-900 border-emerald-200'
          }`}
        >
          {feedbackMsg.isError ? (
            <HelpCircle className="w-4 h-4 text-rose-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* 標題與切換子分頁＋新增方案快捷鈕 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-black text-stone-900 flex items-center gap-2">
              <Crown className="w-5 h-5 text-purple-600" />
              <span>會員方案與費率管理</span>
            </h3>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
              管理員專屬
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            配置全站平台基準抽成比例、各解答者方案月費價格、減免抽成率、自訂增刪方案與特權文案。
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新增方案</span>
          </button>

          <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-xl border border-stone-200">
            <button
              type="button"
              onClick={() => setActiveSubTab('commission_and_plans')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'commission_and_plans'
                  ? 'bg-purple-700 text-white shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5" />
                <span>抽成與價格管理</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('copy_editor')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'copy_editor'
                  ? 'bg-purple-700 text-white shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5" />
                <span>特權文案編輯</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('preview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'preview'
                  ? 'bg-purple-700 text-white shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" />
                <span>前台視圖預覽</span>
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* SUB-TAB 1: 平台抽成與各方案價格管理 */}
      {activeSubTab === 'commission_and_plans' && (
        <div className="space-y-6">
          {/* 1. 核心基準平台抽成設定 (0% ~ 30%，預設 10%) */}
          <div className="p-5 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="font-extrabold text-sm sm:text-base text-purple-950 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-purple-600" />
                  <span>平台基準抽成比例設定（目前：{sliderRate}%）</span>
                </h4>
                <p className="text-xs text-purple-900/70 mt-0.5">
                  全站基礎平台抽成費率，支援 0% ～ 30% 動態調整，套用於全站方案解鎖與懸賞交易基礎清算。
                </p>
              </div>

              <div className="text-right">
                <span className="text-2xl font-black text-purple-900 font-mono">{sliderRate}%</span>
              </div>
            </div>

            <div className="space-y-2">
              <input
                type="range"
                min={0}
                max={30}
                step={1}
                value={sliderRate}
                onChange={(e) => setSliderRate(Number(e.target.value))}
                className="w-full accent-purple-600 cursor-pointer h-2 bg-purple-200 rounded-lg"
              />
              <div className="flex justify-between text-[11px] text-purple-900/70 font-semibold font-mono">
                <span>0% (免抽成)</span>
                <span>10% (預設)</span>
                <span>20% (標準)</span>
                <span>25% (加成)</span>
                <span>30% (上限)</span>
              </div>
            </div>
          </div>

          {/* 2. 各方案價格、減免抽成率與訂閱人數管理 */}
          <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="font-extrabold text-sm sm:text-base text-stone-900 flex items-center gap-2">
                  <Percent className="w-4 h-4 text-amber-600" />
                  <span>各方案價格、減免抽成率與訂閱人數管理</span>
                </h4>
                <p className="text-xs text-stone-500 mt-0.5">
                  管理者可調整各方案月費價格及減免抽成率（實質抽成率 = 基準抽成 {sliderRate}% - 減免抽成率）。支援新增與刪除自訂方案！
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>新增方案</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveCommissionAndPlans}
                  className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 active:bg-purple-800 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>儲存全站抽成與方案設定</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              {activePlanList.map((plan) => {
                const isFree = plan.id === 'free';
                const effectiveFee = sliderRate - (plan.rebatePercent ?? 0);
                const count = getSubscriberCount(plan.id);

                return (
                  <div
                    key={plan.id}
                    className={`p-3.5 rounded-2xl border space-y-3 flex flex-col justify-between transition-all ${
                      plan.id === 'master'
                        ? 'bg-gradient-to-br from-amber-50 to-orange-50/50 border-amber-300'
                        : plan.id === 'authority'
                        ? 'bg-purple-50/50 border-purple-200'
                        : plan.id === 'expert' || plan.id === 'pro'
                        ? 'bg-blue-50/50 border-blue-200'
                        : isFree
                        ? 'bg-white border-stone-200'
                        : 'bg-emerald-50/40 border-emerald-200'
                    }`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-stone-900">{plan.name}</span>
                          {plan.id === 'master' && <Crown className="w-3.5 h-3.5 text-amber-600 fill-amber-600" />}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/80 text-stone-700 border border-stone-200/60 shadow-2xs">
                            {count} 人
                          </span>
                          {!isFree && (
                            <button
                              type="button"
                              onClick={() => setDeleteTargetPlan(plan)}
                              title="刪除此方案"
                              className="p-1 rounded-md text-stone-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {isFree ? (
                        <div className="space-y-1">
                          <div className="text-xs text-stone-500">月費 NT$ 0（無門檻）</div>
                          <div className="text-xs font-semibold text-stone-700">
                            標準抽成：<strong className="text-purple-700">{sliderRate}%</strong>（減免 0%）
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <label className="text-[11px] text-stone-500 shrink-0">月費 NT$:</label>
                            <input
                              type="number"
                              value={plan.monthlyPrice}
                              onChange={(e) => handleFieldChange(plan.id, 'monthlyPrice', Number(e.target.value))}
                              className="w-full px-2 py-1 bg-white border border-stone-300 focus:border-purple-500 rounded-lg text-xs font-mono font-bold"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-[11px] text-stone-500 shrink-0">減免抽成率 %:</label>
                            <input
                              type="number"
                              value={plan.rebatePercent}
                              onChange={(e) => handleFieldChange(plan.id, 'rebatePercent', Number(e.target.value))}
                              className="w-full px-2 py-1 bg-white border border-stone-300 focus:border-purple-500 rounded-lg text-xs font-mono font-bold"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="text-[11px] font-semibold pt-2 border-t border-stone-200/60 flex items-center justify-between">
                      <span className="text-stone-500">實質抽成率：</span>
                      <strong className="text-stone-900 font-bold">
                        {effectiveFee <= 0
                          ? effectiveFee < 0
                            ? `+${Math.abs(effectiveFee)}% BONUS`
                            : '0% (免服務費)'
                          : `${effectiveFee}%`}{' '}
                        <span className="text-[10px] text-stone-400 font-normal">
                          (實收 {100 - effectiveFee}%)
                        </span>
                      </strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: 特權文案編輯器 */}
      {activeSubTab === 'copy_editor' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-xs text-stone-500 uppercase tracking-wider">
              各方案前台名稱、副標與待遇文案編輯
            </h4>
            <button
              type="button"
              onClick={handleSaveAllCopy}
              className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>儲存所有方案文案</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {activePlanList.filter((p) => p.id !== 'free').map((plan) => (
              <div
                key={plan.id}
                className="p-5 rounded-3xl bg-white border border-stone-200 shadow-2xs space-y-4"
              >
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-black">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-stone-900">{plan.name}</h4>
                      <span className="text-[10px] text-stone-500 font-bold">
                        代號：{plan.id}・{getSubscriberCount(plan.id)} 人訂閱
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-[11px] font-bold text-stone-700 block mb-1">方案標題名稱</label>
                    <input
                      type="text"
                      value={plan.name}
                      onChange={(e) => handleFieldChange(plan.id, 'name', e.target.value)}
                      className="w-full px-3 py-1.5 bg-stone-50 focus:bg-white border border-stone-300 rounded-xl font-bold text-stone-900 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-stone-700 block mb-1">平台服務費折抵文字</label>
                    <input
                      type="text"
                      value={plan.feeDiscountText}
                      onChange={(e) => handleFieldChange(plan.id, 'feeDiscountText', e.target.value)}
                      className="w-full px-3 py-1.5 bg-stone-50 focus:bg-white border border-stone-300 rounded-xl text-stone-900 font-bold outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-stone-700 block mb-1">特色副標說明</label>
                    <input
                      type="text"
                      value={plan.tagline}
                      onChange={(e) => handleFieldChange(plan.id, 'tagline', e.target.value)}
                      className="w-full px-3 py-1.5 bg-stone-50 focus:bg-white border border-stone-300 rounded-xl text-stone-900 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-stone-700 block mb-1">核心特權條列（以換行分隔）</label>
                    <textarea
                      rows={4}
                      value={plan.benefits?.join('\n') || ''}
                      onChange={(e) =>
                        handleFieldChange(
                          plan.id,
                          'benefits',
                          e.target.value.split('\n')
                        )
                      }
                      className="w-full p-2.5 bg-stone-50 focus:bg-white border border-stone-300 rounded-xl text-xs text-stone-800 outline-none leading-relaxed"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: 前台視圖預覽 */}
      {activeSubTab === 'preview' && (
        <div className="p-4 rounded-3xl bg-stone-50 border border-stone-200 space-y-3">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span>以下為前台使用者看到的「解答者會員方案視覺化對比」與更改方案介面：</span>
          </div>
          <SubscriptionPlanCard />
        </div>
      )}

      {/* ========================================================================= */}
      {/* 新增方案彈窗 Modal */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-stone-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-emerald-600" />
                <h4 className="font-extrabold text-base text-stone-900">新增解答者會員方案</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewPlan} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">方案名稱 *</label>
                  <input
                    type="text"
                    required
                    placeholder="例：菁英顧問方案"
                    value={newPlanName}
                    onChange={(e) => setNewPlanName(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl font-bold text-stone-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">方案代號 (ID，選填)</label>
                  <input
                    type="text"
                    placeholder="例：elite_consultant"
                    value={newPlanId}
                    onChange={(e) => setNewPlanId(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl font-mono text-stone-900 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">參考月費 NT$ *</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={newPlanMonthlyPrice}
                    onChange={(e) => setNewPlanMonthlyPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl font-mono font-bold text-stone-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">減免抽成率 % *</label>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    required
                    value={newPlanRebate}
                    onChange={(e) => setNewPlanRebate(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl font-mono font-bold text-stone-900 outline-none"
                  />
                  <span className="text-[10px] text-stone-500 mt-0.5 block">
                    實質抽成 = 基準 {sliderRate}% - 減免 {newPlanRebate}% = {sliderRate - newPlanRebate}%
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">徽章視覺色系</label>
                <div className="flex gap-2">
                  {[
                    { id: 'emerald', label: '翡翠綠', cls: 'bg-emerald-100 text-emerald-800' },
                    { id: 'blue', label: '天藍色', cls: 'bg-blue-100 text-blue-800' },
                    { id: 'purple', label: '紫金色', cls: 'bg-purple-100 text-purple-800' },
                    { id: 'amber', label: '暖金色', cls: 'bg-amber-100 text-amber-800' },
                    { id: 'stone', label: '沉穩灰', cls: 'bg-stone-100 text-stone-800' },
                  ].map((color) => (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => setNewPlanBadgeColor(color.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        newPlanBadgeColor === color.id
                          ? 'border-emerald-600 ring-2 ring-emerald-400 font-black'
                          : 'border-stone-200 hover:bg-stone-100'
                      } ${color.cls}`}
                    >
                      {color.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">特色副標短語</label>
                <input
                  type="text"
                  placeholder="例：專為高階機構量身打造的專屬特權"
                  value={newPlanTagline}
                  onChange={(e) => setNewPlanTagline(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">核心特權清單（每行一項）</label>
                <textarea
                  rows={4}
                  value={newPlanBenefits}
                  onChange={(e) => setNewPlanBenefits(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 outline-none leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 font-bold cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>建立並開通方案</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 儲存確認彈窗 */}
      {/* ========================================================================= */}
      {confirmSaveModal && confirmSaveModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-stone-200 text-stone-900">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-stone-900">
                  {confirmSaveModal.type === 'commission_only'
                    ? `確認儲存平台基準抽成為 ${confirmSaveModal.targetRate || sliderRate}%？`
                    : confirmSaveModal.type === 'copy_only'
                    ? '確認儲存所有方案特權文案？'
                    : '確認儲存全站抽成與方案設定？'}
                </h3>
                <span className="text-[11px] text-stone-500 font-bold">
                  平台營運會員設定二次確認
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 text-xs text-stone-700 leading-relaxed">
              {confirmSaveModal.type === 'commission_only' && (
                <p>
                  基準抽成將更新為 <strong>{confirmSaveModal.targetRate || sliderRate}%</strong>，並自動同步至全站所有未減免之方案及懸賞交易。
                </p>
              )}
              {confirmSaveModal.type === 'all_plans' && (
                <p>
                  即將同步儲存基準抽成 <strong>{sliderRate}%</strong> 及各會員等級之月費價格、減免抽成率設定。全站即刻生效。
                </p>
              )}
              {confirmSaveModal.type === 'copy_only' && (
                <p>
                  即將更新各會員方案的前台名稱、副標與權益特權文案，並同步呈現在前台訂閱卡片與會員升級中心。
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setConfirmSaveModal(null)}
                className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-bold cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmSaveModal.type === 'commission_only') {
                    executeSaveCommissionOnly();
                  } else if (confirmSaveModal.type === 'copy_only') {
                    executeSaveAllCopy();
                  } else {
                    executeSaveCommissionAndPlans();
                  }
                }}
                className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-xs font-black shadow-xs transition-all cursor-pointer"
              >
                確認儲存
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {deleteTargetPlan && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-stone-200">
            <div className="flex items-center gap-2.5 text-rose-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h4 className="font-black text-base text-stone-900">確認刪除此方案？</h4>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              您即將刪除<strong>「{deleteTargetPlan.name}」</strong>（代號：{deleteTargetPlan.id}）。刪除後全站將不再顯示此方案。
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setDeleteTargetPlan(null)}
                className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs font-bold cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-xs transition-all cursor-pointer"
              >
                確認刪除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

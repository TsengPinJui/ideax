import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { SubscriptionTier, SubscriptionPlan, SUBSCRIPTION_PLANS, RECHARGE_PACKAGES } from '../types';
import {
  Crown,
  CreditCard,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  User,
  ArrowLeft,
  Info,
  Check,
  AlertCircle,
  Receipt,
  Zap,
  ArrowRight,
  Coins,
  Gift,
} from 'lucide-react';

interface MembershipAndTopupFullPageProps {
  initialTab?: 'membership' | 'topup';
  onBack?: () => void;
}

export const MembershipAndTopupFullPage: React.FC<MembershipAndTopupFullPageProps> = ({
  initialTab = 'membership',
  onBack,
}) => {
  const {
    currentUser,
    subscribePlan,
    subscriptionPlans,
    commissionRate,
    openAboutModal,
    openAuthModal,
    depositPackage,
    depositBalance,
    showCenterToast,
  } = useApp();

  // 子網址與分頁狀態切換 (membership | topup)
  const [activeSubTab, setActiveSubTab] = useState<'membership' | 'topup'>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      const search = window.location.search.toLowerCase();
      if (
        path.includes('/topup') ||
        path.includes('/recharge') ||
        search.includes('tab=topup') ||
        search.includes('tab=recharge')
      ) {
        return 'topup';
      }
    }
    return initialTab;
  });

  // 當內部頁籤切換時，動態同步網址與 SEO 狀態
  const handleTabChange = (tab: 'membership' | 'topup') => {
    setActiveSubTab(tab);
    if (typeof window !== 'undefined') {
      const targetPath = tab === 'membership' ? '/membership' : '/topup';
      window.history.pushState({ tab }, '', targetPath);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // ----------------------------------------------------
  // 1. 會員方案訂閱狀態 (Membership Plan State)
  // ----------------------------------------------------
  const currentTier: SubscriptionTier = currentUser.subscriptionTier || 'free';
  const currentPlan =
    subscriptionPlans[currentTier] ||
    SUBSCRIPTION_PLANS[currentTier as keyof typeof SUBSCRIPTION_PLANS] ||
    SUBSCRIPTION_PLANS.free;

  const defaultTargetTier =
    currentTier === 'free'
      ? subscriptionPlans.expert
        ? 'expert'
        : subscriptionPlans.pro
        ? 'pro'
        : Object.keys(subscriptionPlans)[1] || 'free'
      : currentTier;

  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>(defaultTargetTier as SubscriptionTier);
  const [selectedCycle, setSelectedCycle] = useState<'monthly' | 'semi_annual' | 'annual'>('monthly');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'信用卡' | 'LINE Pay' | 'Apple Pay' | 'ATM 虛擬帳號'>(
    '信用卡'
  );
  const [agreeSubscriptionTerms, setAgreeSubscriptionTerms] = useState(true);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscriptionMsg, setSubscriptionMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  // 取得目標方案資料
  const targetPlan =
    subscriptionPlans[selectedTier] ||
    SUBSCRIPTION_PLANS[selectedTier as keyof typeof SUBSCRIPTION_PLANS] ||
    currentPlan;

  const targetCycleObj =
    targetPlan?.billingCycles?.find((c) => c.cycle === selectedCycle) ||
    targetPlan?.billingCycles?.[0] || {
      cycle: 'monthly',
      price: targetPlan?.monthlyPrice || 0,
      label: '月繳',
      durationMonths: 1,
    };

  // 全站基準抽成百分比
  const baseRatePercent = Math.round((commissionRate || 0.1) * 100);

  // 計算指定方案之實收比例
  const getDynamicPlanRate = (plan: SubscriptionPlan) => {
    const rebate = plan.rebatePercent ?? 0;
    const effectiveFeePercent = Math.max(0, baseRatePercent - rebate);
    const sellerPayoutPercent = 100 - effectiveFeePercent;
    return { effectiveFeePercent, sellerPayoutPercent, rebate };
  };

  // 處理訂閱提交動作
  const handleExecuteSubscription = () => {
    if (currentUser.id === 'user-guest') {
      openAuthModal('login');
      showCenterToast('請先登入帳號', '欲開通會員方案，請先一鍵登入以將方案權益繫結至您的個人帳號。');
      return;
    }

    if (!agreeSubscriptionTerms) {
      setSubscriptionMsg({ text: '請先勾選同意《點數儲值與會員方案訂閱服務條款》', isError: true });
      return;
    }

    setIsSubscribing(true);
    const res = subscribePlan(selectedTier, selectedCycle, selectedPaymentMethod);

    if (res.success) {
      setSubscriptionMsg({
        text: `🎉 成功開通「${targetPlan.name}」！自動帶入帳號【${currentUser.name}】，即刻享有專屬服務費減免與特權！`,
        isError: false,
      });
      showCenterToast(
        '會員方案開通成功！',
        `帳號 ${currentUser.name} 已成功轉換為 ${targetPlan.name}，次期將自動保持優惠與特權。`
      );
    } else {
      setSubscriptionMsg({ text: res.message || '開通處理失敗，請重試。', isError: true });
    }

    setIsSubscribing(false);
    setTimeout(() => setSubscriptionMsg(null), 6000);
  };

  // ----------------------------------------------------
  // 2. 點數儲值狀態 (Top-Up / Points Recharge State)
  // ----------------------------------------------------
  const userSurveyCompany = (currentUser.surveyData as Record<string, any> | undefined)?.companyName || '';
  const [topupMode, setTopupMode] = useState<'package' | 'custom'>('package');
  const [selectedPackageId, setSelectedPackageId] = useState<string>(RECHARGE_PACKAGES[1]?.id || 'pkg-popular');
  const [customNTD, setCustomNTD] = useState<number | ''>(1000);
  const [invoiceType, setInvoiceType] = useState<'personal' | 'business'>('personal');
  const [companyTaxId, setCompanyTaxId] = useState<string>(userSurveyCompany ? '83291045' : '');
  const [companyTitle, setCompanyTitle] = useState<string>(userSurveyCompany);
  const [agreeRechargeTerms, setAgreeRechargeTerms] = useState(true);
  const [isTopupProcessing, setIsTopupProcessing] = useState(false);
  const [topupResultMsg, setTopupResultMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  // 選中的儲值方案
  const selectedPackage = RECHARGE_PACKAGES.find((p) => p.id === selectedPackageId) || RECHARGE_PACKAGES[0];

  // 自訂金額計算點數 (NT$ 1 = 1 點, 滿 $3000 加贈 10%, 滿 $10,000 加贈 20%)
  const calculateCustomPoints = (amount: number) => {
    if (!amount || amount <= 0) return { base: 0, bonus: 0, total: 0 };
    const base = amount;
    let bonusRate = 0;
    if (amount >= 10000) bonusRate = 0.2;
    else if (amount >= 3000) bonusRate = 0.1;
    else if (amount >= 1500) bonusRate = 0.05;

    const bonus = Math.floor(amount * bonusRate);
    return { base, bonus, total: base + bonus };
  };

  const customCalc = calculateCustomPoints(typeof customNTD === 'number' ? customNTD : 0);

  // 計算最終訂單應付 NT$ 與獲得點數
  const finalRechargePrice = topupMode === 'package' ? selectedPackage.price : typeof customNTD === 'number' ? customNTD : 0;
  const finalRechargePoints = topupMode === 'package' ? selectedPackage.totalPoints : customCalc.total;

  // 執行儲值購買動作
  const handleExecuteTopup = () => {
    if (currentUser.id === 'user-guest') {
      openAuthModal('login');
      showCenterToast('請先登入帳號', '儲值前請先登入或註冊帳號，以確保儲值點數準確記入您的個人錢包。');
      return;
    }

    if (finalRechargePrice <= 0) {
      setTopupResultMsg({ text: '請選擇儲值方案或輸入有效儲值金額', isError: true });
      return;
    }

    if (!agreeRechargeTerms) {
      setTopupResultMsg({ text: '請先勾選同意《點數儲值與會員方案訂閱服務條款》', isError: true });
      return;
    }

    if (invoiceType === 'business' && (!companyTaxId.trim() || !companyTitle.trim())) {
      setTopupResultMsg({ text: '選擇三聯式發票時，請填寫統一編號與公司抬頭', isError: true });
      return;
    }

    setIsTopupProcessing(true);

    if (topupMode === 'package') {
      depositPackage(selectedPackage.id);
    } else {
      depositBalance(finalRechargePoints);
    }

    setIsTopupProcessing(false);
    setTopupResultMsg({
      text: `⚡ 儲值成功！已成功撥付 NT$ ${finalRechargePrice.toLocaleString()}，自動帶入身份【${
        currentUser.name
      }】，${finalRechargePoints.toLocaleString()} 點已存入錢包可用餘額！`,
      isError: false,
    });

    showCenterToast(
      '點數儲值成功！',
      `已有 ${finalRechargePoints.toLocaleString()} 點存入帳號 (${currentUser.email || currentUser.name})，發票開立類別：${
        invoiceType === 'business' ? `統一編號 ${companyTaxId}` : '電子發票個人載具'
      }。`
    );

    setTimeout(() => setTopupResultMsg(null), 7000);
  };

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 pt-20 pb-24 font-sans selection:bg-amber-500 selection:text-stone-950">
      {/* 頂部頁頭引導專區 */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mb-8">
        <div className="flex items-center justify-between gap-4 mb-4">
          <button
            type="button"
            onClick={onBack || (() => (window.location.href = '/'))}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-400 hover:text-amber-400 transition-colors cursor-pointer bg-stone-800/80 px-3 py-1.5 rounded-xl border border-stone-700/80 hover:border-amber-500/50"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>返回平台主頁</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-black bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-full border border-amber-500/20">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>獨立專屬頁面系統</span>
            </span>
          </div>
        </div>

        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500/20 via-amber-400/10 to-amber-500/20 px-4 py-1.5 rounded-full border border-amber-500/30 text-amber-300 text-xs font-bold shadow-lg shadow-amber-500/5">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>IdeaX 獨立儲值與會員方案中心</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            {activeSubTab === 'membership' ? '尊榮會員方案與專家特權訂閱' : '金流錢包與點數儲值中心'}
          </h1>

          <p className="text-xs sm:text-sm text-stone-400 leading-relaxed max-w-2xl mx-auto">
            全站交易採金管會合規雙向獨立扣抵機制。系統會自動繫結帶入您當前的會員身份，享有專屬抽成減免優惠與即時點數存入保障。
          </p>

          {/* 雙核心子網址導覽切換 Tab 按鈕 */}
          <div className="pt-3 flex justify-center">
            <div className="p-1.5 bg-stone-800/90 rounded-2xl border border-stone-700/80 inline-flex items-center gap-2 shadow-xl">
              <button
                type="button"
                onClick={() => handleTabChange('membership')}
                className={`px-5 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-2 ${
                  activeSubTab === 'membership'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-stone-950 shadow-md shadow-amber-500/20 scale-102'
                    : 'text-stone-300 hover:text-white hover:bg-stone-700/50'
                }`}
              >
                <Crown className="w-4 h-4" />
                <span>👑 會員方案訂閱</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('topup')}
                className={`px-5 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-2 ${
                  activeSubTab === 'topup'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-stone-950 shadow-md shadow-amber-500/20 scale-102'
                    : 'text-stone-300 hover:text-white hover:bg-stone-700/50'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>💳 點數儲值中心</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
        {/* ========================================================= */}
        {/* 核心重點功能：當前操作用戶身份自動帶入與驗證卡片 (Bound User Identity) */}
        {/* ========================================================= */}
        <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-stone-800/90 via-stone-850 to-stone-900 border border-stone-700/90 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-start sm:items-center gap-4">
              <div className="relative shrink-0">
                {currentUser.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-14 h-14 rounded-2xl object-cover ring-2 ring-amber-500/40 shadow-lg"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-stone-950 font-black text-xl shadow-lg ring-2 ring-amber-500/40">
                    {currentUser.name ? currentUser.name[0] : 'U'}
                  </div>
                )}
                {currentUser.verifiedExpert && (
                  <span className="absolute -bottom-1 -right-1 bg-amber-500 text-stone-950 p-1 rounded-full text-[10px] shadow-xs">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-md border border-amber-500/30">
                    👤 已自動繫結操作身份
                  </span>
                  <span className="text-xs font-mono text-stone-400">UID: {currentUser.id}</span>
                </div>

                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-white">{currentUser.name}</h3>
                  <span className="text-xs text-stone-400">(@{currentUser.username})</span>
                </div>

                <div className="flex items-center gap-3 text-xs text-stone-300 flex-wrap">
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-amber-400" />
                    <span>身分：{currentUser.role === 'admin' ? '官方管理員' : currentUser.verifiedExpert ? '認證專家/解答者' : '一般用戶'}</span>
                  </span>
                  <span className="text-stone-600">•</span>
                  <span>Email: {currentUser.email || '未設定'}</span>
                </div>
              </div>
            </div>

            {/* 現有方案與可用點數總覽 */}
            <div className="flex items-center gap-3 sm:gap-4 border-t md:border-t-0 md:border-l border-stone-700/80 pt-4 md:pt-0 md:pl-6">
              <div className="p-3.5 rounded-2xl bg-stone-900/80 border border-stone-700/80 text-center min-w-[120px]">
                <span className="text-[10px] font-bold text-stone-400 block mb-0.5">目前訂閱方案</span>
                <span className="text-sm font-black text-amber-400 block">{currentPlan.name}</span>
                <span className="text-[10px] font-semibold text-stone-400 block mt-0.5">{currentPlan.feeDiscountText}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center min-w-[130px]">
                <span className="text-[10px] font-bold text-amber-300 block mb-0.5">帳戶點數餘額</span>
                <span className="text-lg sm:text-xl font-black text-amber-400 font-mono block">
                  {(currentUser.balance || 0).toLocaleString()} <span className="text-xs font-bold text-amber-300">點</span>
                </span>
                <span className="text-[10px] font-semibold text-amber-300/80 block mt-0.5">可用託管預扣</span>
              </div>
            </div>
          </div>

          {/* 訪客提醒或已登入狀態提示 */}
          <div className="mt-4 pt-3 border-t border-stone-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            {currentUser.id === 'user-guest' ? (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center justify-between gap-3 w-full">
                <span className="flex items-center gap-1.5 font-semibold">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>您目前為訪客體驗模式，請先登入帳號以自動將儲值點數或會員權益繫結至您的個人帳戶。</span>
                </span>
                <button
                  type="button"
                  onClick={() => openAuthModal('login')}
                  className="px-3 py-1 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 font-black rounded-lg shrink-0 cursor-pointer transition-all text-xs"
                >
                  ⚡ 一鍵登入 / 註冊帶入身份
                </button>
              </div>
            ) : (
              <div className="text-emerald-400 flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>身份驗證通過：您在此頁執行的所有訂閱升級與點數儲值，均會自動記入帳號「{currentUser.name}」({currentUser.email})</span>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* SUBTAB 1: 會員方案訂閱頁面內容 (/membership) */}
        {/* ========================================================= */}
        {activeSubTab === 'membership' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* 訊息反饋通知 */}
            {subscriptionMsg && (
              <div
                className={`p-4 rounded-2xl border text-sm font-bold flex items-center gap-2 ${
                  subscriptionMsg.isError
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                }`}
              >
                <Info className="w-5 h-5 shrink-0" />
                <span>{subscriptionMsg.text}</span>
              </div>
            )}

            {/* 方案卡片清單 (Free / Expert / Authority / Master) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {Object.keys(subscriptionPlans)
                .filter((k) => k !== 'pro' || !subscriptionPlans.expert)
                .map((tierKey) => {
                  const plan = subscriptionPlans[tierKey as SubscriptionTier];
                  if (!plan) return null;
                  const isCurrent = currentTier === tierKey;
                  const isSelected = selectedTier === tierKey;
                  const { effectiveFeePercent, sellerPayoutPercent, rebate } = getDynamicPlanRate(plan);
                  const planBadge = (plan as any).badge;
                  const planFeatures: string[] = (plan as any).features || [
                    '平台專屬解答權限',
                    '交易第三方價金代管',
                    '個人帳戶點數儲值與管理',
                  ];

                  return (
                    <div
                      key={tierKey}
                      onClick={() => setSelectedTier(tierKey as SubscriptionTier)}
                      className={`rounded-3xl p-6 border transition-all cursor-pointer relative flex flex-col justify-between ${
                        isSelected
                          ? 'bg-stone-800/95 border-amber-400 ring-2 ring-amber-400/50 shadow-2xl shadow-amber-500/10 -translate-y-1'
                          : 'bg-stone-850/80 border-stone-700 hover:border-stone-500 hover:bg-stone-800/80'
                      }`}
                    >
                      {/* 標籤徽章 */}
                      {planBadge && (
                        <span className="absolute -top-3 right-6 bg-gradient-to-r from-amber-500 to-amber-400 text-stone-950 text-[10px] font-black px-3 py-0.5 rounded-full shadow-md uppercase tracking-wider">
                          {planBadge}
                        </span>
                      )}

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-lg font-black text-white flex items-center gap-2">
                            <Crown className={`w-5 h-5 ${tierKey === 'free' ? 'text-stone-400' : 'text-amber-400'}`} />
                            <span>{plan.name}</span>
                          </h4>
                          {isCurrent && (
                            <span className="text-[11px] font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-md border border-amber-500/30">
                              目前方案
                            </span>
                          )}
                        </div>

                        {/* 價格資訊 */}
                        <div className="border-b border-stone-700/80 pb-4">
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl sm:text-3xl font-black text-white font-mono">
                              {plan.monthlyPrice === 0 ? 'NT$ 0' : `NT$ ${plan.monthlyPrice.toLocaleString()}`}
                            </span>
                            <span className="text-xs font-bold text-stone-400">/ 月</span>
                          </div>
                          <p className="text-xs text-stone-400 mt-1">{plan.tagline || '專屬抽成與功能特權'}</p>
                        </div>

                        {/* 實收折抵亮點 */}
                        <div className="p-3 rounded-2xl bg-stone-900/80 border border-stone-700/60 space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-stone-400 font-medium">平台服務費：</span>
                            <span className="font-bold text-amber-300">{effectiveFeePercent}%</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-stone-400 font-medium">解答實收入帳：</span>
                            <span className="font-bold text-emerald-400">{sellerPayoutPercent}% (免扣成)</span>
                          </div>
                          {rebate > 0 && (
                            <div className="text-[11px] text-amber-400/90 font-bold pt-0.5">
                              ⚡ 比一般會員大幅省下 {rebate}% 服務費！
                            </div>
                          )}
                        </div>

                        {/* 特權清單 */}
                        <div className="space-y-2 pt-1 text-xs">
                          <span className="font-bold text-stone-300 text-[11px] uppercase tracking-wider block">專屬特權：</span>
                          {planFeatures.slice(0, 5).map((feat, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-stone-300 leading-tight">
                              <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                              <span>{feat}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-6">
                        <button
                          type="button"
                          onClick={() => setSelectedTier(tierKey as SubscriptionTier)}
                          className={`w-full py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                            isSelected
                              ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-md shadow-amber-500/20'
                              : 'bg-stone-750 hover:bg-stone-700 text-stone-200 border border-stone-650'
                          }`}
                        >
                          <span>{isCurrent ? '查看與維護特權' : isSelected ? '已選擇此方案' : '選擇方案'}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* 訂閱細節設定與自動帶入身份結帳卡片 */}
            <div className="p-6 sm:p-8 rounded-3xl bg-stone-850 border border-stone-700/80 shadow-2xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-700/80 pb-5">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Crown className="w-5 h-5 text-amber-400" />
                    <span>確認訂閱方案與計費週期</span>
                  </h3>
                  <p className="text-xs text-stone-400 mt-1">
                    當前選擇方案：<strong className="text-amber-300">{targetPlan.name}</strong>（服務費 {getDynamicPlanRate(targetPlan).effectiveFeePercent}%）
                  </p>
                </div>

                <div className="text-xs text-stone-400">
                  繫結帳號：<strong className="text-white">{currentUser.name}</strong> ({currentUser.email || currentUser.id})
                </div>
              </div>

              {/* 選擇計費週期 */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-stone-300 block">1. 選擇計費週期 (方案隨後自動續約，隨時可調整)：</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {targetPlan.billingCycles?.map((cycle) => {
                    const isCycleSelected = selectedCycle === cycle.cycle;
                    const savings = (cycle as any).savingsBadge;
                    return (
                      <div
                        key={cycle.cycle}
                        onClick={() => setSelectedCycle(cycle.cycle)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isCycleSelected
                            ? 'bg-amber-500/10 border-amber-400 ring-2 ring-amber-400/30'
                            : 'bg-stone-800/80 border-stone-700 hover:border-stone-600'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-white">{cycle.label}</span>
                          {savings && (
                            <span className="text-[10px] font-black bg-amber-500 text-stone-950 px-2 py-0.5 rounded-full">
                              {savings}
                            </span>
                          )}
                        </div>
                        <div className="text-lg font-black text-amber-300 font-mono">
                          NT$ {cycle.price.toLocaleString()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 選擇付款方式 */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-stone-300 block">2. 選擇付款管道 (採用金管會合規第三方加密金流)：</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  {(['信用卡', 'LINE Pay', 'Apple Pay', 'ATM 虛擬帳號'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setSelectedPaymentMethod(method)}
                      className={`p-3.5 rounded-2xl border font-bold text-center transition-all cursor-pointer ${
                        selectedPaymentMethod === method
                          ? 'bg-amber-500/15 border-amber-400 text-amber-300 ring-2 ring-amber-400/30'
                          : 'bg-stone-800/80 border-stone-700 text-stone-300 hover:border-stone-600'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              {/* 條款與確認按鈕 */}
              <div className="pt-2 border-t border-stone-700/80 space-y-4">
                <label className="flex items-start gap-2 text-xs text-stone-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreeSubscriptionTerms}
                    onChange={(e) => setAgreeSubscriptionTerms(e.target.checked)}
                    className="mt-0.5 rounded border-stone-600 text-amber-500 focus:ring-amber-400 cursor-pointer"
                  />
                  <span>
                    我已閱讀並同意{' '}
                    <button
                      type="button"
                      onClick={() => openAboutModal('recharge_subscription_terms')}
                      className="text-amber-400 hover:underline font-bold"
                    >
                      《點數儲值與會員方案訂閱服務條款》
                    </button>
                    ，並確認自動將訂閱特權繫結至帳號「{currentUser.name}」。
                  </span>
                </label>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-stone-400">
                    應付總金額：<strong className="text-xl text-amber-400 font-mono font-black">NT$ {targetCycleObj.price.toLocaleString()}</strong>
                  </div>

                  <button
                    type="button"
                    onClick={handleExecuteSubscription}
                    disabled={isSubscribing}
                    className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 active:from-amber-600 text-stone-950 font-black text-sm rounded-2xl shadow-xl shadow-amber-500/20 cursor-pointer transition-all hover:scale-102 active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Zap className="w-4 h-4 fill-stone-950" />
                    <span>{isSubscribing ? '開通處理中...' : `確認付款 NT$ ${targetCycleObj.price.toLocaleString()} 開通特權`}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SUBTAB 2: 點數儲值中心內容 (/topup) */}
        {/* ========================================================= */}
        {activeSubTab === 'topup' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* 訊息反饋通知 */}
            {topupResultMsg && (
              <div
                className={`p-4 rounded-2xl border text-sm font-bold flex items-center gap-2 ${
                  topupResultMsg.isError
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                }`}
              >
                <Info className="w-5 h-5 shrink-0" />
                <span>{topupResultMsg.text}</span>
              </div>
            )}

            {/* 儲值模式選擇：熱門套裝 vs 自訂金額 */}
            <div className="p-6 sm:p-8 rounded-3xl bg-stone-850 border border-stone-700/80 shadow-2xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-700/80 pb-5">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-amber-400" />
                    <span>選擇點數儲值方案</span>
                  </h3>
                  <p className="text-xs text-stone-400 mt-1">1 點即可折抵 NT$ 1 元懸賞與專家解鎖費用，點數永不過期。</p>
                </div>

                <div className="flex items-center gap-1 bg-stone-800 p-1 rounded-xl border border-stone-700 text-xs">
                  <button
                    type="button"
                    onClick={() => setTopupMode('package')}
                    className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      topupMode === 'package' ? 'bg-amber-500 text-stone-950' : 'text-stone-300 hover:text-white'
                    }`}
                  >
                    超值點數方案
                  </button>
                  <button
                    type="button"
                    onClick={() => setTopupMode('custom')}
                    className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      topupMode === 'custom' ? 'bg-amber-500 text-stone-950' : 'text-stone-300 hover:text-white'
                    }`}
                  >
                    自訂儲值金額
                  </button>
                </div>
              </div>

              {/* 模式 1: 超值點數方案卡片 */}
              {topupMode === 'package' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-xs">
                  {RECHARGE_PACKAGES.map((pkg) => {
                    const isSelected = selectedPackageId === pkg.id;
                    const bonus = (pkg as any).bonusPoints || 0;
                    return (
                      <div
                        key={pkg.id}
                        onClick={() => setSelectedPackageId(pkg.id)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-400 ring-2 ring-amber-400/40 shadow-lg shadow-amber-500/10 -translate-y-1'
                            : 'bg-stone-800/80 border-stone-700 hover:border-stone-600'
                        }`}
                      >
                        {pkg.isPopular && (
                          <span className="absolute -top-2.5 right-3 bg-amber-500 text-stone-950 font-black text-[10px] px-2 py-0.5 rounded-full shadow-md">
                            熱門推薦
                          </span>
                        )}

                        <div className="space-y-2">
                          <span className="text-[10px] font-black text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-md inline-block">
                            {pkg.tag}
                          </span>
                          <div className="text-xl font-black font-mono text-white block mt-1">
                            {pkg.totalPoints.toLocaleString()} <span className="text-xs font-normal text-stone-400">點</span>
                          </div>
                          <div className="text-xs font-bold text-amber-400">售價 NT$ {pkg.price.toLocaleString()}</div>
                          {bonus > 0 && (
                            <div className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                              <Gift className="w-3 h-3" />
                              <span>加贈 {bonus.toLocaleString()} 點</span>
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          className={`mt-4 w-full py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500 text-stone-950 font-black'
                              : 'bg-stone-700 text-stone-300 hover:bg-stone-600'
                          }`}
                        >
                          {isSelected ? '已選擇' : '選擇方案'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 模式 2: 自訂金額輸入 */}
              {topupMode === 'custom' && (
                <div className="p-6 rounded-2xl bg-stone-800/80 border border-stone-700 space-y-4">
                  <label className="text-xs font-bold text-stone-300 block">輸入您預計儲值的金額 (NT$)：</label>
                  <div className="flex items-center gap-3 max-w-md">
                    <span className="text-lg font-black text-amber-400">NT$</span>
                    <input
                      type="number"
                      min={100}
                      max={100000}
                      step={100}
                      value={customNTD}
                      onChange={(e) => setCustomNTD(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                      placeholder="輸入儲值金額 (例: 2000)"
                      className="w-full px-4 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-white font-mono font-bold text-base focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div className="p-4 rounded-xl bg-stone-900/90 border border-stone-700/80 text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-stone-400">基礎發行點數：</span>
                      <span className="font-bold text-white font-mono">{customCalc.base.toLocaleString()} 點</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-400">滿額加贈獎勵點數：</span>
                      <span className="font-bold text-emerald-400 font-mono">+{customCalc.bonus.toLocaleString()} 點</span>
                    </div>
                    <div className="flex justify-between border-t border-stone-700 pt-1.5 font-bold">
                      <span className="text-amber-300">儲值後獲得總點數：</span>
                      <span className="text-amber-400 font-mono text-base">{customCalc.total.toLocaleString()} 點</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 發票與開立資料填寫 (自動帶入身份) */}
              <div className="space-y-3 pt-2">
                <label className="text-xs font-bold text-stone-300 block flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-amber-400" />
                  <span>電子發票開立選項 (買受人資料已自動帶入)：</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => setInvoiceType('personal')}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      invoiceType === 'personal'
                        ? 'bg-amber-500/10 border-amber-400 text-amber-300 ring-2 ring-amber-400/30'
                        : 'bg-stone-800/80 border-stone-700 text-stone-400'
                    }`}
                  >
                    <div className="font-bold text-white">個人雲端電子發票</div>
                    <div className="text-[11px] text-stone-400 mt-0.5">自動寄至帳號 Email: {currentUser.email || '尚未設定'}</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInvoiceType('business')}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      invoiceType === 'business'
                        ? 'bg-amber-500/10 border-amber-400 text-amber-300 ring-2 ring-amber-400/30'
                        : 'bg-stone-800/80 border-stone-700 text-stone-400'
                    }`}
                  >
                    <div className="font-bold text-white">公司三聯式發票 (可報帳)</div>
                    <div className="text-[11px] text-stone-400 mt-0.5">需輸入統一編號與公司抬頭</div>
                  </button>
                </div>

                {invoiceType === 'business' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <input
                      type="text"
                      value={companyTaxId}
                      onChange={(e) => setCompanyTaxId(e.target.value)}
                      placeholder="請輸入公司統一編號 (8碼)"
                      className="px-4 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-white text-xs focus:border-amber-400 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={companyTitle}
                      onChange={(e) => setCompanyTitle(e.target.value)}
                      placeholder="請輸入公司抬頭抬頭"
                      className="px-4 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-white text-xs focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* 付款管道與結帳條款 */}
              <div className="pt-4 border-t border-stone-700/80 space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-0.5 text-xs">
                    <div className="text-stone-400">
                      儲值綁定帳號：<strong className="text-white">{currentUser.name}</strong> ({currentUser.id})
                    </div>
                    <div className="text-stone-400">
                      應付總金額：<strong className="text-xl text-amber-400 font-mono font-black">NT$ {finalRechargePrice.toLocaleString()}</strong>
                      <span className="text-emerald-400 font-bold ml-2">(獲得 {finalRechargePoints.toLocaleString()} 點)</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleExecuteTopup}
                    disabled={isTopupProcessing}
                    className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 active:from-amber-600 text-stone-950 font-black text-sm rounded-2xl shadow-xl shadow-amber-500/20 cursor-pointer transition-all hover:scale-102 active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Coins className="w-4 h-4 fill-stone-950" />
                    <span>{isTopupProcessing ? '金流處置中...' : `確認支付 NT$ ${finalRechargePrice.toLocaleString()} 並立即入帳`}</span>
                  </button>
                </div>

                <label className="flex items-start gap-2 text-[11px] text-stone-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreeRechargeTerms}
                    onChange={(e) => setAgreeRechargeTerms(e.target.checked)}
                    className="mt-0.5 rounded border-stone-600 text-amber-500 focus:ring-amber-400 cursor-pointer"
                  />
                  <span>
                    點擊確認支付即代表您同意{' '}
                    <button
                      type="button"
                      onClick={() => openAboutModal('recharge_subscription_terms')}
                      className="text-amber-400 hover:underline font-bold"
                    >
                      《點數儲值與會員方案訂閱服務條款》
                    </button>
                    。全站點數專供於發布懸賞與專家落地方案解鎖對價扣抵。
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

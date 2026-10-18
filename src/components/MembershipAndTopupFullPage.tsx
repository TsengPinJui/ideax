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
  Lock,
} from 'lucide-react';
import { PointsGuideModal } from './PointsGuideModal';

interface MembershipAndTopupFullPageProps {
  initialTab?: 'membership' | 'topup';
  onBack?: () => void;
}

// 根據方案 tier 取得真正差異化的專屬特權項目
const getPlanBenefits = (tierKey: string, plan: any): string[] => {
  if (tierKey === 'free') {
    return [
      '全站發問與解答提案權限',
      '平台服務費 10%（標準費率）',
      'AI-CRM 工作台：基礎題庫瀏覽與功能預覽',
      '交易第三方價金代管履約保障',
      '個人帳戶點數安全管理與明細記錄',
    ];
  }
  if (tierKey === 'pro' || tierKey === 'expert') {
    return [
      '全站發問與解答提案權限',
      '費率僅 8%（比一般會員現省 2% 服務費，實收 92%）',
      'AI 初步問題分析報告：每月免費查看 50 次',
      'AI 提案架構整理：一鍵整理為 4 層精準架構',
      '🎯 AI-CRM 24hr 客情巡航：基礎巡航與發案意向偵測',
      '🤝 雙向握手提案：市場顧問 × AICRM 媒合推播',
    ];
  }
  if (tierKey === 'authority') {
    return [
      '全站發問與解答提案權限',
      '超低服務費 5%（比一般會員大幅省下 5% 服務費，實收 95%）',
      'AI 初步問題分析報告：全站免費無限次查看及下載',
      'AI 提案架構整理：一鍵整理為 4 層架構',
      '✨ 升級高賞提案優先推薦曝光位',
      '🎯 AI-CRM 24hr 客情巡航雷達：實時巡弋全站題庫與發案者猶豫期',
      '🤝 雙向握手提案：即時推播雙向高契合專案商機',
    ];
  }
  if (tierKey === 'master') {
    return [
      '全站發問與解答提案權限',
      '極低 2% 服務費（比一般會員現省 8% 服務費，實收高達 98%）',
      '🏆 大師專屬最高權重金牌標章曝光',
      'AI 初步問題分析報告：無限制次數深度研究',
      'AI 提案架構整理：4 層架構 + 交付甘特圖',
      '🎯 AI-CRM 24hr 全天候主動獲客巡弋雷達',
      '💬 24hr AI客服特助：專案破冰與自訂 Prompt 代答',
      '👑 專屬 1 對 1 商業顧問諮詢與金流即時撥付',
    ];
  }
  if (Array.isArray(plan?.benefits) && plan.benefits.length > 0) {
    return plan.benefits;
  }
  return (plan as any)?.features || ['平台專屬解答權限', '交易第三方價金代管', '個人帳戶點數儲值與管理'];
};

export const MembershipAndTopupFullPage: React.FC<MembershipAndTopupFullPageProps> = ({
  initialTab = 'membership',
  onBack,
}) => {
  const [isPointsGuideOpen, setIsPointsGuideOpen] = useState(false);
  const {
    currentUser,
    subscribePlan,
    subscriptionPlans,
    commissionRate,
    openAboutModal,
    openAuthModal,
    openCustomerService,
    showCenterToast,
  } = useApp();

  const isAdmin = currentUser.role === 'admin';

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
  const [selectedPaymentMethod] = useState<'平台點數扣點'>('平台點數扣點');
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
  // 2. 點數儲值狀態 (Top-Up / Points Recharge State) - 固定套裝方案，無自訂金額
  // ----------------------------------------------------
  const userSurveyCompany = (currentUser.surveyData as Record<string, any> | undefined)?.companyName || '';
  const [selectedPackageId, setSelectedPackageId] = useState<string>(RECHARGE_PACKAGES[1]?.id || 'pack-599');
  const [invoiceType, setInvoiceType] = useState<'personal' | 'business'>('personal');
  const [companyTaxId, setCompanyTaxId] = useState<string>(userSurveyCompany ? '83291045' : '');
  const [companyTitle, setCompanyTitle] = useState<string>(userSurveyCompany);
  const [agreeRechargeTerms, setAgreeRechargeTerms] = useState(true);
  const [topupResultMsg, setTopupResultMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  // 選中的儲值方案（固定套裝）
  const selectedPackage = RECHARGE_PACKAGES.find((p) => p.id === selectedPackageId) || RECHARGE_PACKAGES[0];

  // 計算最終訂單應付 NT$ 與獲得點數
  const finalRechargePrice = selectedPackage.price;
  const finalRechargePoints = selectedPackage.totalPoints;

  // 執行儲值購買動作（目前暫不支援外部金流）
  const handleExecuteTopup = () => {
    setTopupResultMsg({
      text: '💡 目前所有外部金流儲值選項（信用卡 / LINE Pay / Apple Pay / ATM）暫不支援，平台目前僅支援使用既有帳戶點數進行扣點。',
      isError: true,
    });
    showCenterToast('目前暫不支援外部金流儲值', '目前所有金流選項暫不支援，僅支援使用平台點數扣點。');
    setTimeout(() => setTopupResultMsg(null), 6000);
  };

  // ----------------------------------------------------
  // 非管理員時：鎖定頁面，顯示「尚未開放」全頁畫面
  // ----------------------------------------------------
  if (!isAdmin) {
    return (
      <div className="w-full min-h-screen bg-stone-950 text-stone-100 pt-16 pb-28 font-sans selection:bg-amber-500 selection:text-stone-950 flex items-center justify-center px-4 sm:px-6">
        <div className="max-w-xl w-full text-center p-8 sm:p-12 rounded-3xl bg-stone-900/90 border border-stone-800 shadow-2xl space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/5">
            <Lock className="w-10 h-10 text-amber-400 animate-pulse" />
          </div>

          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-bold">
              <span>🔒 系統功能升級中 · 暫未開放</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {activeSubTab === 'membership' ? '會員方案頁面尚未開放' : '點數儲值中心尚未開放'}
            </h2>
            <p className="text-xs sm:text-sm text-stone-400 leading-relaxed max-w-md mx-auto">
              目前平台處於創星季競賽營運階段，線上點數儲值與付費會員訂閱尚未對一般用戶開放（僅供平台官方管理團隊進行系統配置與測試）。
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-stone-850 border border-stone-700/80 text-left text-xs text-stone-300 space-y-2.5">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <Info className="w-4 h-4 shrink-0" />
              <span>用戶重要權益提示：</span>
            </div>
            <ul className="text-stone-400 space-y-1.5 pl-6 list-disc">
              <li>您的帳號享有發布問題、提出痛點、參與社群討論與自由提案等完整基礎功能。</li>
              <li>
                帳戶現有餘額（
                <strong className="text-amber-400 font-mono">
                  {(currentUser.balance || 0).toLocaleString()} 點
                </strong>
                ）仍可正常用於提問懸賞委託與落地方案解鎖。
              </li>
              <li>儲值與會員方案正式開通時，系統將透過全站公告第一時間發布通知。</li>
            </ul>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={onBack || (() => (window.location.href = '/'))}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-stone-950 font-black text-xs cursor-pointer transition-all shadow-md flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>返回平台主頁</span>
            </button>
            <button
              type="button"
              onClick={() => openCustomerService({ topic: '詢問儲值與會員方案開放時間' })}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 font-bold text-xs cursor-pointer transition-all flex items-center justify-center gap-2"
            >
              <span>聯繫官方客服 💬</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-stone-950 text-stone-100 pt-16 pb-28 font-sans selection:bg-amber-500 selection:text-stone-950">
      {/* 官方管理員特權模式警示條 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 mb-6">
        <div className="p-4 rounded-2xl bg-purple-950/80 border border-purple-500/40 text-purple-200 text-xs font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-purple-400 shrink-0" />
            <span>【官方管理員特權模式】此頁面對一般用戶全面顯示「尚未開放（鎖定中）」，僅平台管理團隊具備完整檢視、測試與配置權限。</span>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-purple-500/30 text-purple-300 text-[10px] font-mono border border-purple-400/40 shrink-0 self-start sm:self-auto">
            ADMIN EXCLUSIVE ACCESS
          </span>
        </div>
      </div>

      {/* 頂部頁頭引導專區 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 mb-8">
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

          <button
            type="button"
            onClick={() => setIsPointsGuideOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 hover:text-amber-200 underline underline-offset-4 cursor-pointer"
          >
            點數、創星幣、打賞、懸賞、解鎖有什麼不同？
          </button>
          <PointsGuideModal isOpen={isPointsGuideOpen} onClose={() => setIsPointsGuideOpen(false)} />

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
                          {cycle.price.toLocaleString()} 點
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 選擇付款方式 */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-stone-300 block">2. 付款管道（目前暫時只支援平台點數扣點，外部金流暫不支援）：</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                  <button
                    type="button"
                    className="p-3.5 rounded-2xl border font-bold text-center transition-all cursor-pointer bg-amber-500/15 border-amber-400 text-amber-300 ring-2 ring-amber-400/30"
                  >
                    <div>🪙 平台點數扣點</div>
                    <div className="text-[10px] text-amber-200/80 font-normal mt-0.5">
                      餘額 {(currentUser.balance || 0).toLocaleString()} 點
                    </div>
                  </button>
                  {(['信用卡', 'LINE Pay', 'Apple Pay', 'ATM 虛擬帳號'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      disabled
                      className="p-3.5 rounded-2xl border font-bold text-center bg-stone-800/40 border-stone-700/60 text-stone-500 opacity-60 cursor-not-allowed"
                    >
                      <div>{method}</div>
                      <div className="text-[10px] font-normal mt-0.5">暫不支援</div>
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
                    應付總點數：<strong className="text-xl text-amber-400 font-mono font-black">{targetCycleObj.price.toLocaleString()} 點</strong>
                  </div>

                  <button
                    type="button"
                    onClick={handleExecuteSubscription}
                    disabled={isSubscribing}
                    className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 active:from-amber-600 text-stone-950 font-black text-sm rounded-2xl shadow-xl shadow-amber-500/20 cursor-pointer transition-all hover:scale-102 active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Zap className="w-4 h-4 fill-stone-950" />
                    <span>{isSubscribing ? '開通處理中...' : `確認扣點 ${targetCycleObj.price.toLocaleString()} 點開通特權`}</span>
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

            {/* 儲值模式選擇：固定超值套裝方案 */}
            <div className="p-6 sm:p-8 rounded-3xl bg-stone-850 border border-stone-700/80 shadow-2xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-700/80 pb-5">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-amber-400" />
                    <span>選擇點數儲值方案</span>
                  </h3>
                  <p className="text-xs text-stone-400 mt-1">IdeaX 官方儲值點數專用於發布委託懸賞與解鎖專家方案，點數永久有效。</p>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>多種面額套裝 · 即選即開通</span>
                </div>
              </div>

              {/* 超值點數方案卡片清單 */}
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
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-300 block">付款方式（目前所有外部金流選項暫不支援）：</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    {(['信用卡', 'LINE Pay', 'Apple Pay', 'ATM 虛擬帳號'] as const).map((method) => (
                      <button
                        key={method}
                        type="button"
                        disabled
                        className="p-3 rounded-2xl border font-bold text-center bg-stone-800/40 border-stone-700/60 text-stone-500 opacity-60 cursor-not-allowed"
                      >
                        <div>{method}</div>
                        <div className="text-[10px] font-normal mt-0.5">暫不支援</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-0.5 text-xs">
                    <div className="text-stone-400">
                      儲值綁定帳號：<strong className="text-white">{currentUser.name}</strong> ({currentUser.id})
                    </div>
                    <div className="text-stone-400">
                      選擇方案：<strong className="text-xl text-amber-400 font-mono font-black">{finalRechargePoints.toLocaleString()} 點</strong>
                      <span className="text-stone-400 font-bold ml-2">(外部金流儲值暫不開放)</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleExecuteTopup}
                    className="w-full sm:w-auto px-8 py-3.5 bg-stone-700 hover:bg-stone-600 text-stone-300 font-black text-sm rounded-2xl cursor-pointer transition-all flex items-center justify-center gap-2"
                  >
                    <Coins className="w-4 h-4" />
                    <span>外部金流暫不支援（僅支援既有平台點數）</span>
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

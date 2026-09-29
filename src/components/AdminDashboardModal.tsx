import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { SubscriptionTier } from '../types';
import { exportSurveyToExcelXlsx } from '../utils/exportSurveyExcel';
import {
  X,
  Sliders,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Users,
  HelpCircle,
  FileSpreadsheet,
  ArrowLeft,
  Award,
  Sparkles,
  Percent,
  Layers,
  Save,
  BarChart3,
  Eye,
  EyeOff,
  Trash2,
  RefreshCw,
  UserCheck,
  ArrowLeftRight,
  Shield,
  Activity,
  Coins,
  AlertTriangle,
  Crown,
} from 'lucide-react';

interface AdminDashboardModalProps {
  onClose: () => void;
  isFullPage?: boolean;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({ onClose, isFullPage = false }) => {
  const {
    commissionRate,
    setCommissionRate,
    subscriptionPlans,
    updateSubscriptionPlan,
    questions,
    solvers,
    answers,
    transactions,
    availableUsers,
    publicMetricsConfig,
    updatePublicMetricsConfig,
    isDemoMode,
    setDemoMode,
    toggleDemoMode,
    clearMockData,
    resetDemoData,
    switchAccount,
    currentUser,
    isNoPaymentMode,
    setNoPaymentMode,
    toggleNoPaymentMode,
    isHideTestAccounts,
    setHideTestAccounts,
    toggleHideTestAccounts,
  } = useApp();

  const [pendingConfirm, setPendingConfirm] = useState<{
    type: 'liveOperation' | 'demo' | 'noPayment' | 'hideTestAccounts';
    nextState: boolean;
  } | null>(null);

  const handleConfirmToggle = () => {
    if (!pendingConfirm) return;
    if (pendingConfirm.type === 'liveOperation') {
      if (pendingConfirm.nextState) {
        setHideTestAccounts(true);
        setNoPaymentMode(false);
        setDemoMode(false);
      } else {
        setHideTestAccounts(false);
      }
    } else if (pendingConfirm.type === 'demo') {
      toggleDemoMode();
    } else if (pendingConfirm.type === 'noPayment') {
      toggleNoPaymentMode();
    } else if (pendingConfirm.type === 'hideTestAccounts') {
      toggleHideTestAccounts();
    }
    setPendingConfirm(null);
  };

  const [sliderRate, setSliderRate] = useState<number>(Math.round(commissionRate * 100));
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Local state for editing plans
  const [editablePlans, setEditablePlans] = useState(() => {
    return Object.keys(subscriptionPlans).reduce((acc, key) => {
      const tier = key as SubscriptionTier;
      acc[tier] = {
        monthlyPrice: subscriptionPlans[tier].monthlyPrice,
        rebatePercent: subscriptionPlans[tier].rebatePercent,
      };
      return acc;
    }, {} as Record<SubscriptionTier, { monthlyPrice: number; rebatePercent: number }>);
  });

  // Compute platform metrics
  const totalGMV = transactions.reduce((acc, t) => acc + t.amount, 0);
  const totalPlatformFees = transactions.reduce((acc, t) => acc + t.platformFee, 0);
  const totalBountyPool = questions.filter((q) => q.status === 'open').reduce((acc, q) => acc + q.bounty, 0);
  const solvedQuestionsCount = questions.filter((q) => q.status === 'solved').length;
  const openQuestionsCount = questions.filter((q) => q.status === 'open').length;

  // Plan user counts
  const planUserCounts: Record<SubscriptionTier, number> = {
    free: availableUsers.filter((u) => !u.subscriptionTier || u.subscriptionTier === 'free').length + 86,
    pro: availableUsers.filter((u) => u.subscriptionTier === 'pro').length + 24,
    expert: availableUsers.filter((u) => u.subscriptionTier === 'expert').length + 15,
    authority: availableUsers.filter((u) => u.subscriptionTier === 'authority').length + 7,
    master: availableUsers.filter((u) => u.subscriptionTier === 'master').length + 3,
  };

  const verifiedSolversCount = solvers.filter((s) => s.verifiedBadge).length;

  const handleSaveCommission = () => {
    setCommissionRate(sliderRate / 100);
    // Also save all updated plan pricing
    (Object.keys(editablePlans) as SubscriptionTier[]).forEach((tier) => {
      updateSubscriptionPlan(tier, editablePlans[tier].monthlyPrice, editablePlans[tier].rebatePercent);
    });

    setSaveMsg(`平台抽成與各方案價格設定已成功更新！基準抽成 ${sliderRate}%，將即時套用於全站所有解鎖與懸賞清算。`);
    setTimeout(() => setSaveMsg(null), 4000);
  };

  const handlePlanPriceChange = (tier: SubscriptionTier, field: 'monthlyPrice' | 'rebatePercent', val: number) => {
    setEditablePlans((prev) => ({
      ...prev,
      [tier]: {
        ...prev[tier],
        [field]: val,
      },
    }));
  };

  const content = (
    <div
      className={`bg-white rounded-3xl border border-stone-200 shadow-sm w-full ${
        isFullPage
          ? 'max-w-5xl mx-auto my-2'
          : 'max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150'
      }`}
    >
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-stone-200 flex items-center justify-between bg-stone-900 text-white sticky top-0 z-10">
        <div className="flex items-center gap-2.5">
          {isFullPage && (
            <button
              onClick={onClose}
              className="p-2 -ml-2 rounded-xl text-stone-300 hover:text-white hover:bg-stone-800 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
              title="返回問題市場"
            >
              <ArrowLeft className="w-5 h-5 text-amber-400" />
              <span className="hidden sm:inline">返回問題市場</span>
            </button>
          )}
          <div className="w-9 h-9 rounded-xl bg-purple-500 text-white flex items-center justify-center shadow-xs">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold">創點子 IdeaX 運營管理後台</h2>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-600 text-white">
                管理者專屬
              </span>
            </div>
            <p className="text-xs text-stone-400">平台獲利數據・各方案價格與抽成設定・會員分佈・金流稽核</p>
          </div>
        </div>
        {!isFullPage ? (
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl border border-stone-700 hover:bg-stone-800 text-stone-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>返回問題市場</span>
          </button>
        )}
      </div>

      {/* Body */}
      <div className={`p-6 space-y-6 ${!isFullPage ? 'overflow-y-auto' : ''}`}>
        {saveMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-900 text-xs font-semibold flex items-center gap-2 border border-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveMsg}</span>
          </div>
        )}

        {/* 0. 示範資料模式與測試帳號管理 (Demo Mode & Clean Data Controller) */}
        <div className="p-5 rounded-3xl bg-gradient-to-r from-purple-950 via-stone-900 to-indigo-950 text-white shadow-md space-y-4 border border-purple-800/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/30 text-purple-300 text-xs font-bold border border-purple-400/30 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-purple-400" />
                  <span>資料展示模式控制中心</span>
                </span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  isDemoMode ? 'bg-amber-400 text-stone-950' : 'bg-emerald-500 text-white'
                }`}>
                  {isDemoMode ? '🧪 測試環境 (解封測試帳號與假資料)' : '🟢 營運模式 (僅保留核心測試帳號)'}
                </span>
              </div>
              <h3 className="text-base font-black text-white">
                測試環境開關與假資料清理
              </h3>
              <p className="text-xs text-stone-300 mt-0.5 leading-relaxed max-w-2xl">
                提供一鍵切換「測試環境」。測試環境開啟時自動解封所有測試帳號與示範假資料，關閉時隱藏所有模擬題目與虛構用戶。
              </p>
            </div>

            {/* Switch & Action */}
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <button
                type="button"
                onClick={toggleDemoMode}
                className={`px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md ${
                  isDemoMode
                    ? 'bg-amber-400 hover:bg-amber-300 text-stone-950 ring-2 ring-amber-300'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-stone-950 ring-2 ring-emerald-300'
                }`}
              >
                <RefreshCw className="w-4 h-4 text-stone-950" />
                <span>{isDemoMode ? '關閉【測試環境】' : '開啟【測試環境】'}</span>
              </button>

              <button
                type="button"
                onClick={clearMockData}
                className="px-3.5 py-2.5 rounded-xl bg-rose-600/80 hover:bg-rose-600 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-rose-500/50"
                title="一鍵清除瀏覽器暫存之模擬資料，強制回到純淨狀態"
              >
                <Trash2 className="w-3.5 h-3.5 text-white" />
                <span>清除假資料</span>
              </button>

              <button
                type="button"
                onClick={() => exportSurveyToExcelXlsx(availableUsers)}
                className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-white/20"
                title="一鍵下載用戶分佈與習慣統計 Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>下載用戶統計 Excel</span>
              </button>
            </div>
          </div>

          {/* 各身分測試帳號一覽 (Preserved Test Accounts) */}
          <div className="pt-3 border-t border-purple-800/40">
            <span className="text-[11px] font-bold text-purple-300 block mb-2">
              📌 系統固定保留之各身分測試帳號（點擊可快速切換身分進行功能驗證）：
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              {[
                {
                  id: 'user-admin',
                  name: 'IdeaX 管理團隊',
                  roleName: '平台超級管理員',
                  desc: '具備全站管理、審核與抽成設定',
                  badge: '管理員',
                  badgeColor: 'bg-purple-500/30 text-purple-200 border-purple-400/40',
                },
                {
                  id: 'user-questioner',
                  name: '林書豪 (測試提問者)',
                  roleName: '提問者身分',
                  desc: '發布問題、自訂懸賞、採納與評價',
                  badge: '提問者',
                  badgeColor: 'bg-amber-500/30 text-amber-200 border-amber-400/40',
                },
                {
                  id: 'solver-2',
                  name: '陳怡君 (測試專家/解答者)',
                  roleName: '官方專家解答者',
                  desc: '提交解方、解鎖收益、專家私聊',
                  badge: '解答者',
                  badgeColor: 'bg-emerald-500/30 text-emerald-200 border-emerald-400/40',
                },
                {
                  id: 'user-guest',
                  name: '訪客探索體驗',
                  roleName: '免登入訪客模式',
                  desc: '限制僅限瀏覽，驗證攔截防護',
                  badge: '訪客',
                  badgeColor: 'bg-stone-500/30 text-stone-200 border-stone-400/40',
                },
              ].map((acc) => {
                const isCurrent = currentUser.id === acc.id;
                return (
                  <div
                    key={acc.id}
                    className={`p-3 rounded-2xl border transition-all flex flex-col justify-between ${
                      isCurrent
                        ? 'bg-purple-900/60 border-purple-400 ring-2 ring-purple-400/50'
                        : 'bg-stone-900/70 border-stone-800 hover:border-purple-600/60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className={`text-[10px] font-black px-1.5 py-0.2 rounded border ${acc.badgeColor}`}>
                          {acc.badge}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] font-bold text-purple-300">
                            ✓ 目前登入
                          </span>
                        )}
                      </div>
                      <p className="font-black text-xs text-white truncate">{acc.name}</p>
                      <p className="text-[10px] text-stone-400 mt-0.5 line-clamp-2">{acc.desc}</p>
                    </div>

                    {!isCurrent && (
                      <button
                        type="button"
                        onClick={() => switchAccount(acc.id)}
                        className="mt-2.5 w-full py-1 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 text-[11px] font-bold text-purple-200 flex items-center justify-center gap-1 transition-all cursor-pointer"
                      >
                        <ArrowLeftRight className="w-3 h-3 text-purple-300" />
                        <span>切換為此帳號</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 1. 平台獲利數據與核心運營指標 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-amber-600" />
              <span>平台獲利數據與即時運營總覽</span>
            </h3>
            <span className="text-[11px] text-stone-400 font-mono">即時統計</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
              <span className="text-[11px] text-stone-500 font-bold block">平台總交易流水 (GMV)</span>
              <span className="text-xl font-black text-stone-900 font-mono mt-1 block">
                NT$ {(totalGMV || 0).toLocaleString()}
              </span>
              <span className="text-[10px] text-stone-400 mt-0.5 block">累計媒合總額</span>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200">
              <span className="text-[11px] text-amber-800 font-bold block">平台累計獲利 (淨抽成)</span>
              <span className="text-xl font-black text-amber-700 font-mono mt-1 block">
                NT$ {(totalPlatformFees || 0).toLocaleString()}
              </span>
              <span className="text-[10px] text-amber-600 mt-0.5 block">平台實收服務費</span>
            </div>

            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
              <span className="text-[11px] text-stone-500 font-bold block">市場問題總數</span>
              <span className="text-xl font-black text-stone-900 font-mono mt-1 block">
                {questions.length} 題
              </span>
              <span className="text-[10px] text-stone-400 mt-0.5 block">
                招募中 {openQuestionsCount} · 已解決 {solvedQuestionsCount}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
              <span className="text-[11px] text-stone-500 font-bold block">認證專家智庫</span>
              <span className="text-xl font-black text-emerald-700 font-mono mt-1 block">
                {solvers.length} 位
              </span>
              <span className="text-[10px] text-stone-400 mt-0.5 block">
                官方實名認證 {verifiedSolversCount} 位
              </span>
            </div>
          </div>
        </div>

        {/* 2. 首頁公開運營數據展示控制 (管理者自訂選擇要公開那些數據) */}
        <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="font-extrabold text-sm sm:text-base text-amber-950 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-600" />
                <span>首頁公開運營數據展示控制（首頁看板開關）</span>
              </h4>
              <p className="text-xs text-amber-900/70 mt-0.5">
                管理者可自由勾選決定在首頁對外公開呈現的平台真實統計指標，關閉項目將即時於首頁隱藏。
              </p>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-200/80 text-amber-950 border border-amber-300 w-fit">
              已公開 {Object.values(publicMetricsConfig).filter(Boolean).length} / 5 項指標
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {/* Metric 1: 累計解決難題 */}
            <div className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
              publicMetricsConfig.showSolvedCount ? 'bg-white border-amber-300 shadow-2xs' : 'bg-stone-50/80 border-stone-200 opacity-60'
            }`}>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-xs text-stone-900">累計解決難題</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-stone-100 text-stone-600">即時計算</span>
                </div>
                <p className="text-[11px] text-stone-500 mt-0.5">全站已結案問題與專家已採納方案總數</p>
              </div>
              <button
                type="button"
                onClick={() => updatePublicMetricsConfig({ showSolvedCount: !publicMetricsConfig.showSolvedCount })}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                  publicMetricsConfig.showSolvedCount ? 'bg-amber-500' : 'bg-stone-300'
                }`}
                title={publicMetricsConfig.showSolvedCount ? '點擊隱藏此指標' : '點擊公開此指標'}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  publicMetricsConfig.showSolvedCount ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Metric 2: 累計懸賞金額 */}
            <div className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
              publicMetricsConfig.showTotalBounty ? 'bg-white border-amber-300 shadow-2xs' : 'bg-stone-50/80 border-stone-200 opacity-60'
            }`}>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-xs text-stone-900">累計懸賞金額</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">NT$ 即時統計</span>
                </div>
                <p className="text-[11px] text-stone-500 mt-0.5">全站已發布問題與已完成交易方案之懸賞總額</p>
              </div>
              <button
                type="button"
                onClick={() => updatePublicMetricsConfig({ showTotalBounty: !publicMetricsConfig.showTotalBounty })}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                  publicMetricsConfig.showTotalBounty ? 'bg-amber-500' : 'bg-stone-300'
                }`}
                title={publicMetricsConfig.showTotalBounty ? '點擊隱藏此指標' : '點擊公開此指標'}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  publicMetricsConfig.showTotalBounty ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Metric 3: 平均回覆速度 */}
            <div className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
              publicMetricsConfig.showAvgResponseSpeed ? 'bg-white border-amber-300 shadow-2xs' : 'bg-stone-50/80 border-stone-200 opacity-60'
            }`}>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-xs text-stone-900">平均回覆速度</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-stone-100 text-stone-600">時效指標</span>
                </div>
                <p className="text-[11px] text-stone-500 mt-0.5">全體專家諮詢方案平均回覆工時</p>
              </div>
              <button
                type="button"
                onClick={() => updatePublicMetricsConfig({ showAvgResponseSpeed: !publicMetricsConfig.showAvgResponseSpeed })}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                  publicMetricsConfig.showAvgResponseSpeed ? 'bg-amber-500' : 'bg-stone-300'
                }`}
                title={publicMetricsConfig.showAvgResponseSpeed ? '點擊隱藏此指標' : '點擊公開此指標'}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  publicMetricsConfig.showAvgResponseSpeed ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Metric 4: 方案採納滿意度 */}
            <div className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
              publicMetricsConfig.showSatisfactionRate ? 'bg-white border-amber-300 shadow-2xs' : 'bg-stone-50/80 border-stone-200 opacity-60'
            }`}>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-xs text-stone-900">方案採納滿意度</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">% 滿意度</span>
                </div>
                <p className="text-[11px] text-stone-500 mt-0.5">專家星級口碑與方案採納滿意回饋率</p>
              </div>
              <button
                type="button"
                onClick={() => updatePublicMetricsConfig({ showSatisfactionRate: !publicMetricsConfig.showSatisfactionRate })}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                  publicMetricsConfig.showSatisfactionRate ? 'bg-amber-500' : 'bg-stone-300'
                }`}
                title={publicMetricsConfig.showSatisfactionRate ? '點擊隱藏此指標' : '點擊公開此指標'}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  publicMetricsConfig.showSatisfactionRate ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Metric 5: 當前最高賞金 */}
            <div className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
              publicMetricsConfig.showHighestBounty ? 'bg-white border-amber-300 shadow-2xs' : 'bg-stone-50/80 border-stone-200 opacity-60'
            }`}>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-xs text-stone-900">當前最高賞金</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">熱門導流</span>
                </div>
                <p className="text-[11px] text-stone-500 mt-0.5">即時抓取全站最高單題懸賞金額並導流排行</p>
              </div>
              <button
                type="button"
                onClick={() => updatePublicMetricsConfig({ showHighestBounty: !publicMetricsConfig.showHighestBounty })}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                  publicMetricsConfig.showHighestBounty ? 'bg-amber-500' : 'bg-stone-300'
                }`}
                title={publicMetricsConfig.showHighestBounty ? '點擊隱藏此指標' : '點擊公開此指標'}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  publicMetricsConfig.showHighestBounty ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>
        </div>

        {/* 3. 核心基準平台抽成設定 (0% ~ 30%) */}
        <div className="p-5 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="font-extrabold text-sm sm:text-base text-purple-950 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-purple-600" />
                <span>平台基準抽成比例設定（目前：{sliderRate}%）</span>
              </h4>
              <p className="text-xs text-purple-900/70 mt-0.5">
                僅管理者可配置，支援 0% ～ 30% 動態調整，套用於全站方案解鎖與懸賞交易基礎清算。
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
              <span>10% (輕量)</span>
              <span>20% (標準)</span>
              <span>25% (預設)</span>
              <span>30% (上限)</span>
            </div>
          </div>
        </div>

        {/* 3. 各方案的價格和抽成設定 + 各方案人數統計 */}
        <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="font-extrabold text-sm sm:text-base text-stone-900 flex items-center gap-2">
                <Percent className="w-4 h-4 text-amber-600" />
                <span>各方案價格、減免抽成率與訂閱人數管理</span>
              </h4>
              <p className="text-xs text-stone-500 mt-0.5">
                管理者可調整各方案月費價格及減免抽成率（例如基準 10%，減免 5%，則實質抽成 5%），並查看各方案會員人數分佈。
              </p>
            </div>
            <button
              onClick={handleSaveCommission}
              className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer w-fit"
            >
              <Save className="w-3.5 h-3.5" />
              <span>儲存全站抽成與方案設定</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {/* Free */}
            <div className="p-3.5 rounded-xl bg-white border border-stone-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-stone-900">一般會員 (Free)</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                  {planUserCounts.free} 人
                </span>
              </div>
              <div className="text-xs text-stone-500">月費 NT$ 0（無門檻）</div>
              <div className="text-xs font-semibold text-stone-700">
                標準抽成：<strong className="text-purple-700">{sliderRate}%</strong>（減免 0%）
              </div>
              <div className="text-[11px] text-stone-500">
                解答者實收：<strong className="text-stone-900">{100 - sliderRate}%</strong>
              </div>
            </div>

            {/* Pro */}
            <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-blue-900">達人級方案 (Pro)</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  {planUserCounts.pro} 人
                </span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-stone-500 shrink-0">月費 NT$:</label>
                <input
                  type="number"
                  value={editablePlans.pro.monthlyPrice}
                  onChange={(e) => handlePlanPriceChange('pro', 'monthlyPrice', Number(e.target.value))}
                  className="w-20 px-2 py-1 bg-white border border-blue-300 rounded-lg text-xs font-mono font-bold"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-stone-500 shrink-0">減免抽成率 %:</label>
                <input
                  type="number"
                  value={editablePlans.pro.rebatePercent}
                  onChange={(e) => handlePlanPriceChange('pro', 'rebatePercent', Number(e.target.value))}
                  className="w-16 px-2 py-1 bg-white border border-blue-300 rounded-lg text-xs font-mono font-bold"
                />
                <span className="text-[11px] text-blue-700 font-bold">
                  實質 {sliderRate - editablePlans.pro.rebatePercent <= 0 ? (sliderRate - editablePlans.pro.rebatePercent < 0 ? `+${Math.abs(sliderRate - editablePlans.pro.rebatePercent)}% BONUS` : '0%') : `${sliderRate - editablePlans.pro.rebatePercent}%`}
                </span>
              </div>
            </div>

            {/* Expert */}
            <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-amber-950">專家級方案 (Expert)</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                  {planUserCounts.expert} 人
                </span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-stone-500 shrink-0">月費 NT$:</label>
                <input
                  type="number"
                  value={editablePlans.expert.monthlyPrice}
                  onChange={(e) => handlePlanPriceChange('expert', 'monthlyPrice', Number(e.target.value))}
                  className="w-20 px-2 py-1 bg-white border border-amber-300 rounded-lg text-xs font-mono font-bold"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-stone-500 shrink-0">減免抽成率 %:</label>
                <input
                  type="number"
                  value={editablePlans.expert.rebatePercent}
                  onChange={(e) => handlePlanPriceChange('expert', 'rebatePercent', Number(e.target.value))}
                  className="w-16 px-2 py-1 bg-white border border-amber-300 rounded-lg text-xs font-mono font-bold"
                />
                <span className="text-[11px] text-amber-800 font-bold">
                  實質 {sliderRate - editablePlans.expert.rebatePercent <= 0 ? (sliderRate - editablePlans.expert.rebatePercent < 0 ? `+${Math.abs(sliderRate - editablePlans.expert.rebatePercent)}% BONUS` : '0%') : `${sliderRate - editablePlans.expert.rebatePercent}%`}
                </span>
              </div>
            </div>

            {/* Authority */}
            <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-purple-950">權威級方案 (Authority)</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-200 text-purple-900">
                  {planUserCounts.authority} 人
                </span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-stone-500 shrink-0">月費 NT$:</label>
                <input
                  type="number"
                  value={editablePlans.authority.monthlyPrice}
                  onChange={(e) => handlePlanPriceChange('authority', 'monthlyPrice', Number(e.target.value))}
                  className="w-20 px-2 py-1 bg-white border border-purple-300 rounded-lg text-xs font-mono font-bold"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-stone-500 shrink-0">減免抽成率 %:</label>
                <input
                  type="number"
                  value={editablePlans.authority.rebatePercent}
                  onChange={(e) => handlePlanPriceChange('authority', 'rebatePercent', Number(e.target.value))}
                  className="w-16 px-2 py-1 bg-white border border-purple-300 rounded-lg text-xs font-mono font-bold"
                />
                <span className="text-[11px] text-purple-800 font-bold">
                  實質 {sliderRate - editablePlans.authority.rebatePercent <= 0 ? (sliderRate - editablePlans.authority.rebatePercent < 0 ? `+${Math.abs(sliderRate - editablePlans.authority.rebatePercent)}% BONUS` : '0%') : `${sliderRate - editablePlans.authority.rebatePercent}%`}
                </span>
              </div>
            </div>

            {/* Master */}
            <div className="p-3.5 rounded-xl bg-stone-900 text-white border border-stone-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-amber-400">大師級方案 (Master)</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-stone-950">
                  {planUserCounts.master} 人
                </span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-stone-400 shrink-0">月費 NT$:</label>
                <input
                  type="number"
                  value={editablePlans.master.monthlyPrice}
                  onChange={(e) => handlePlanPriceChange('master', 'monthlyPrice', Number(e.target.value))}
                  className="w-20 px-2 py-1 bg-stone-800 border border-stone-700 rounded-lg text-xs font-mono font-bold text-amber-300"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-stone-400 shrink-0">減免抽成率 %:</label>
                <input
                  type="number"
                  value={editablePlans.master.rebatePercent}
                  onChange={(e) => handlePlanPriceChange('master', 'rebatePercent', Number(e.target.value))}
                  className="w-16 px-2 py-1 bg-stone-800 border border-stone-700 rounded-lg text-xs font-mono font-bold text-amber-300"
                />
                <span className="text-[11px] text-amber-400 font-bold">
                  實質 {sliderRate - editablePlans.master.rebatePercent <= 0 ? (sliderRate - editablePlans.master.rebatePercent < 0 ? `+${Math.abs(sliderRate - editablePlans.master.rebatePercent)}% BONUS` : '0%') : `${sliderRate - editablePlans.master.rebatePercent}%`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. 平台交易金流稽核紀錄 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-stone-900 flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-stone-600" />
              <span>平台交易金流與抽成即時稽核紀錄</span>
            </h4>
            <span className="text-xs text-stone-400">共 {transactions.length} 筆即時交易</span>
          </div>

          <div className="divide-y divide-stone-100 max-h-60 overflow-y-auto border border-stone-200 rounded-2xl p-2 bg-stone-50/50">
            {transactions.map((tx) => (
              <div key={tx.id} className="p-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-stone-900 flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-stone-200 text-stone-800 text-[10px]">
                      {tx.type}
                    </span>
                    <span>{tx.relatedQuestionTitle || '系統資金移轉'}</span>
                  </div>
                  <div className="text-[11px] text-stone-500 mt-0.5">
                    發起：{tx.fromUserName || '系統'} {tx.toUserName ? `➔ 對象：${tx.toUserName}` : ''} • {tx.createdAt.split('T')[0]}
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-bold font-mono text-stone-900">
                    NT$ {(tx.amount || 0).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-purple-800 block font-semibold">
                    抽成 NT$ {tx.platformFee}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 6. 平台核心環境控制 (營運模式、測試環境 & 無金流環境開關) */}
        <div className="p-5 rounded-2xl bg-stone-900 text-white border border-stone-800 space-y-4">
          <div className="flex items-center justify-between border-b border-stone-800 pb-3">
            <div>
              <h4 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-purple-400" />
                <span>平台運營底層模式控制 (最底層系統開關)</span>
              </h4>
              <p className="text-xs text-stone-400 mt-0.5">
                可隨時開啟或關閉營運模式、測試環境與無金流環境，即時切換全站前台展示與交易模式。
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* 開關 1 (最首項): 營運模式 (正式上線環境) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-stone-900 via-purple-950/80 to-stone-900 border border-purple-600/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
              <div className="space-y-1 max-w-2xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs sm:text-sm font-black text-purple-200 flex items-center gap-1.5">
                    <Crown className="w-4 h-4 text-amber-400" />
                    <span>營運模式 (正式上線環境)</span>
                  </span>
                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                    isHideTestAccounts && !isNoPaymentMode
                      ? 'bg-emerald-500 text-stone-950 shadow-xs'
                      : 'bg-stone-800 text-stone-400 border border-stone-700'
                  }`}>
                    {isHideTestAccounts && !isNoPaymentMode ? '已開啟 (正式營運)' : '未啟用 (測試/非營運)'}
                  </span>
                </div>
                <p className="text-[11px] text-purple-200/80 leading-relaxed">
                  開啟營運模式將自動<strong>隱藏所有測試帳號</strong>（僅保留管理員與真實註冊會員），並且<strong>關閉無金流環境</strong>（啟用正式商業金流與第三方履約託管）。
                </p>
              </div>

              <div className="shrink-0 self-stretch sm:self-auto flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setPendingConfirm({
                    type: 'liveOperation',
                    nextState: !(isHideTestAccounts && !isNoPaymentMode)
                  })}
                  className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shadow-md ${
                    isHideTestAccounts && !isNoPaymentMode
                      ? 'bg-amber-400 hover:bg-amber-300 text-stone-950'
                      : 'bg-purple-600 hover:bg-purple-500 text-white'
                  }`}
                >
                  {isHideTestAccounts && !isNoPaymentMode ? '關閉【營運模式】' : '開啟【營運模式】'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* 開關 2: 測試環境 */}
              <div className="p-4 rounded-xl bg-stone-800/80 border border-stone-700 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-purple-300 flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-purple-400" />
                      <span>測試環境 (Demo & Test Data)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setPendingConfirm({ type: 'demo', nextState: !isDemoMode })}
                      className={`px-3 py-1 rounded-full font-bold text-xs transition-all cursor-pointer ${
                        isDemoMode
                          ? 'bg-amber-400 text-stone-950 font-black'
                          : 'bg-stone-700 text-stone-300 hover:bg-stone-600'
                      }`}
                    >
                      {isDemoMode ? '已開啟 (測試展示)' : '已關閉 (純淨營運)'}
                    </button>
                  </div>
                  <p className="text-[11px] text-stone-400 leading-relaxed">
                    解封所有測試帳號並恢復示範貼文與假資料。關閉時自動切換至純淨模式（僅保留測試帳號與真實註冊會員）。
                  </p>
                </div>

                {/* 測試環境開關下面再加一個開關：隱藏測試帳號（僅保留管理員） */}
                <div className="p-3 rounded-xl bg-stone-900/90 border border-stone-700/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-purple-300 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-purple-400" />
                      <span>隱藏測試帳號（僅保留管理員）</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setPendingConfirm({ type: 'hideTestAccounts', nextState: !isHideTestAccounts })}
                      className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] transition-all cursor-pointer ${
                        isHideTestAccounts
                          ? 'bg-purple-600 text-white font-black'
                          : 'bg-stone-700 text-stone-300 hover:bg-stone-600'
                      }`}
                    >
                      {isHideTestAccounts ? '公開顯示 測試帳號' : '隱藏測試帳號'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isHideTestAccounts ? 'bg-purple-600/30 text-purple-300 border border-purple-500/30' : 'bg-stone-800 text-stone-400'}`}>
                      {isHideTestAccounts ? '已隱藏(僅保留管理員)' : '已公開測試帳號'}
                    </span>
                  </div>
                  <p className="text-[10px] text-stone-400 leading-relaxed">
                    開啟後隱藏林書豪、陳怡君及訪客等測試帳號，全站僅保留超級管理員與真實註冊會員。
                  </p>
                </div>
              </div>

              {/* 開關 3: 無金流環境 */}
              <div className="p-4 rounded-xl bg-stone-800/80 border border-stone-700 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-emerald-300 flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-emerald-400" />
                      <span>無金流環境 (Pure Free Mode)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setPendingConfirm({ type: 'noPayment', nextState: !isNoPaymentMode })}
                      className={`px-3 py-1 rounded-full font-bold text-xs transition-all cursor-pointer ${
                        isNoPaymentMode
                          ? 'bg-emerald-400 text-stone-950 font-black'
                          : 'bg-stone-700 text-stone-300 hover:bg-stone-600'
                      }`}
                    >
                      {isNoPaymentMode ? '已開啟 (點擊關閉)' : '已關閉 (點擊開啟)'}
                    </button>
                  </div>
                  <p className="text-[11px] text-stone-400 leading-relaxed mt-2">
                    隱藏全站會員訂閱方案與儲值點數機制，僅開放 L0 免費問題與討論，提問與解答全數免費無對價，聊天室詢價自動改為「諮詢」、報價改為「提案」。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 二次確認彈窗 */}
      {pendingConfirm && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-stone-200 text-stone-900">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-stone-900">
                  {pendingConfirm.type === 'liveOperation'
                    ? (pendingConfirm.nextState ? '確認開啟【營運模式】？' : '確認關閉【營運模式】？')
                    : pendingConfirm.type === 'demo'
                    ? (pendingConfirm.nextState ? '確認開啟【測試環境】？' : '確認關閉【測試環境】？')
                    : pendingConfirm.type === 'noPayment'
                    ? (pendingConfirm.nextState ? '確認開啟【無金流環境】？' : '確認關閉【無金流環境】？')
                    : (pendingConfirm.nextState ? '確認執行【隱藏測試帳號】？' : '確認執行【公開顯示 測試帳號】？')}
                </h3>
                <span className="text-[11px] text-stone-500 font-bold">
                  系統運營底層模式變更二次確認
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 text-xs text-stone-700 leading-relaxed">
              {pendingConfirm.type === 'liveOperation' && (
                pendingConfirm.nextState
                  ? '即將開啟【正式營運模式】：系統將自動隱藏所有測試帳號（僅保留管理員與真實註冊會員），並且關閉無金流環境（全面啟用正式商業金流與履約託管機制）。'
                  : '即將關閉【正式營運模式】：系統將恢復顯示測試帳號供內部測試使用。'
              )}
              {pendingConfirm.type === 'demo' && (
                pendingConfirm.nextState
                  ? '即將解封所有測試帳號並載入預設示範問題、提案、專家與測試交易數據。'
                  : '即將隱藏所有模擬示範貼文與假資料，切換為純淨營運模式。'
              )}
              {pendingConfirm.type === 'noPayment' && (
                pendingConfirm.nextState
                  ? '即將隱藏會員訂閱方案與儲值點數，全站開放免費提問、無償解答與諮詢提案。'
                  : '即將關閉無金流環境，恢復標準商業會員訂閱方案與懸賞點數機制。'
              )}
              {pendingConfirm.type === 'hideTestAccounts' && (
                pendingConfirm.nextState
                  ? '即將在全站用戶列表與切換帳號選單中隱藏林書豪、陳怡君與訪客等測試帳號，僅保留超級管理員與真實註冊用戶。'
                  : '即將恢復顯示核心測試帳號（林書豪、陳怡君、訪客等），供測試雙向身分流程。'
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setPendingConfirm(null)}
                className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-bold cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmToggle}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs ${
                  pendingConfirm.nextState
                    ? 'bg-amber-500 hover:bg-amber-400 text-stone-950'
                    : 'bg-stone-900 hover:bg-stone-800 text-white'
                }`}
              >
                確認{pendingConfirm.nextState ? (pendingConfirm.type === 'hideTestAccounts' ? '隱藏' : '開啟') : (pendingConfirm.type === 'hideTestAccounts' ? '公開' : '關閉')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between">
        <span className="text-xs text-stone-500">
          創點子 IdeaX 運營與金流治理中樞 • 權限：超管席位
        </span>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-200 text-xs font-semibold cursor-pointer"
        >
          {isFullPage ? '返回問題市場' : '關閉管理面板'}
        </button>
      </div>

      {/* 平台版本號與最近更新時間 (淡淡細細印上) */}
      <div className="py-2.5 text-center bg-stone-50/50 border-t border-stone-200/60 text-[10px] sm:text-[11px] text-stone-400 font-mono tracking-tight select-none">
        IdeaX 商業智庫管理平台 · 平台版本號：v2026.09.28-release · 最近更新時間：{new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' })} {new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })} · 系統正常
      </div>
    </div>
  );

  if (isFullPage) {
    return <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{content}</div>;
  }

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {content}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { SubscriptionTier } from '../types';
import { exportSurveyToExcelXlsx } from '../utils/exportSurveyExcel';
import { isMockTransactionId, isMockQuestionId, isRealRegisteredUser } from '../data/mockData';
import { getTransactionBadge } from './AdminTransactionsTab';
import { CompetitionAdminReviewTab } from './CompetitionAdminReviewTab';
import { AdminSiteTrafficChart } from './AdminSiteTrafficChart';
import { APP_VERSION, APP_RELEASE_DATE, APP_LAST_UPDATED } from '../data/versionData';
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
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Search,
  Copy,
  Check,
  Zap,
  Compass,
  PlusCircle,
  Flame,
  GraduationCap,
  ExternalLink,
} from 'lucide-react';
import { getAutomatedDistributionStatus, AutomatedDistributionStatus } from '../services/rewardAutomationService';

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
    aiCrmConfig,
    updateAiCrmConfig,
    isRaceMode,
    setRaceMode,
    toggleRaceMode,
    isSimulatedDataPurged,
    purgeAllSimulatedData,
    restoreAllSimulatedData,
    simulatedStats,
    siteVisitsCount,
    onlineUsersCount,
  } = useApp();

  const [pendingConfirm, setPendingConfirm] = useState<{
    type: 'liveOperation' | 'demo' | 'noPayment' | 'race' | 'hideTestAccounts' | 'clearMockData' | 'saveBaseCommission' | 'saveFullCommissionAndPlans' | 'savePublicMetrics' | 'saveAiCrmConfig';
    nextState?: boolean;
    data?: any;
  } | null>(null);

  const [sliderRate, setSliderRate] = useState<number>(Math.round(commissionRate * 100));
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Local state for public metrics
  const [localPublicMetrics, setLocalPublicMetrics] = useState({ ...publicMetricsConfig });
  useEffect(() => {
    setLocalPublicMetrics({ ...publicMetricsConfig });
  }, [publicMetricsConfig]);
  const [isPublicMetricsExpanded, setIsPublicMetricsExpanded] = useState<boolean>(false);
  const hasPublicMetricsChanges = JSON.stringify(localPublicMetrics) !== JSON.stringify(publicMetricsConfig);

  // Local state for AI-CRM config
  const [localAiCrmConfig, setLocalAiCrmConfig] = useState({ ...aiCrmConfig });
  const hasAiCrmChanges = JSON.stringify(localAiCrmConfig) !== JSON.stringify(aiCrmConfig);

  const [autoRewardStatus] = useState<AutomatedDistributionStatus>(() => getAutomatedDistributionStatus());


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

  const isCommissionChanged = sliderRate !== Math.round(commissionRate * 100);

  const executeSaveCommissionOnly = () => {
    const newBaseRate = sliderRate / 100;
    setCommissionRate(newBaseRate);
    (Object.keys(editablePlans) as SubscriptionTier[]).forEach((tier) => {
      updateSubscriptionPlan(tier, editablePlans[tier].monthlyPrice, editablePlans[tier].rebatePercent, newBaseRate);
    });
    setSaveMsg(`🎉 平台基準抽成設定已成功儲存！基準抽成率已更新為 ${sliderRate}%，即時套用於全站所有解鎖與懸賞清算。`);
    setPendingConfirm(null);
    setTimeout(() => setSaveMsg(null), 4000);
  };

  const executeSaveCommissionAndPlans = () => {
    const newBaseRate = sliderRate / 100;
    setCommissionRate(newBaseRate);
    (Object.keys(editablePlans) as SubscriptionTier[]).forEach((tier) => {
      updateSubscriptionPlan(tier, editablePlans[tier].monthlyPrice, editablePlans[tier].rebatePercent, newBaseRate);
    });
    setSaveMsg(`🎉 平台抽成與各方案價格設定已成功儲存！基準抽成 ${sliderRate}%，各方案月費與減免率已同步更新！`);
    setPendingConfirm(null);
    setTimeout(() => setSaveMsg(null), 4000);
  };

  const executeSavePublicMetrics = () => {
    updatePublicMetricsConfig(localPublicMetrics);
    setSaveMsg('🎉 首頁公開運營數據展示控制已成功儲存並同步至前台！');
    setPendingConfirm(null);
    setTimeout(() => setSaveMsg(null), 4000);
  };

  const executeSaveAiCrmConfig = () => {
    updateAiCrmConfig(localAiCrmConfig);
    setSaveMsg('🎉 AI-CRM 巡航排程與運營策略設定已成功儲存並生效！');
    setPendingConfirm(null);
    setTimeout(() => setSaveMsg(null), 4000);
  };

  const handleConfirmAction = () => {
    if (!pendingConfirm) return;
    if (pendingConfirm.type === 'liveOperation') {
      if (pendingConfirm.nextState) {
        // 開啟正式營運模式 (NORM) ➔ 自動關閉無金流模式與測試環境，全平台恢復真實數據
        setNoPaymentMode(false);
      } else {
        // 關閉正式營運模式 ➔ 相對地自動切換為【無金流模式】
        setNoPaymentMode(true);
      }
    } else if (pendingConfirm.type === 'noPayment') {
      if (pendingConfirm.nextState) {
        // 開啟無金流模式 (FREE) ➔ 自動關閉正式營運模式與測試環境，全平台恢復真實數據並隱藏金流
        setNoPaymentMode(true);
      } else {
        // 關閉無金流模式 ➔ 相對地自動切換為【正式營運模式】
        setNoPaymentMode(false);
      }
    } else if (pendingConfirm.type === 'demo') {
      if (pendingConfirm.nextState) {
        setDemoMode(true);
      } else {
        setNoPaymentMode(false);
      }
    } else if (pendingConfirm.type === 'race') {
      if (pendingConfirm.nextState) {
        setRaceMode(true);
      } else {
        setRaceMode(false);
      }
    } else if (pendingConfirm.type === 'hideTestAccounts') {
      if (pendingConfirm.nextState) {
        setHideTestAccounts(true);
      } else {
        setHideTestAccounts(false);
      }
    } else if (pendingConfirm.type === 'clearMockData') {
      purgeAllSimulatedData().then((res) => {
        setSaveMsg(`✨ 已自本機與雲端 Firestore 資料庫徹底刪除全部模擬資料（含 ${res.purgedQuestions} 篇模擬貼文、${res.purgedAnswers} 則模擬討論、${res.purgedUsers} 位模擬帳號），真實資料完整保留！`);
        setTimeout(() => setSaveMsg(null), 5000);
      });
    } else if (pendingConfirm.type === 'saveBaseCommission') {
      executeSaveCommissionOnly();
      return;
    } else if (pendingConfirm.type === 'saveFullCommissionAndPlans') {
      executeSaveCommissionAndPlans();
      return;
    } else if (pendingConfirm.type === 'savePublicMetrics') {
      executeSavePublicMetrics();
      return;
    } else if (pendingConfirm.type === 'saveAiCrmConfig') {
      executeSaveAiCrmConfig();
      return;
    }
    setPendingConfirm(null);
  };

  // Compute platform metrics (正式營運模式 NORM 與無金流模式 FREE 下，累計懸賞金額與全站總交易額均純淨歸零 0)
  const totalGMV = isNoPaymentMode || !isDemoMode
    ? 0
    : transactions.reduce((acc, t) => acc + (t.amount || 0), 0);
  const totalPlatformFees = isNoPaymentMode || !isDemoMode
    ? 0
    : transactions.reduce((acc, t) => acc + (t.platformFee || 0), 0);
  const totalBountyPool = isNoPaymentMode || !isDemoMode
    ? 0
    : questions.filter((q) => q.status === 'open').reduce((acc, q) => acc + (q.bounty || 0), 0);
  const solvedQuestionsCount = questions.filter((q) => q.status === 'solved').length;
  const totalTipsSiteWide = questions.reduce((acc, q) => acc + (q.supportPoints || 0), 0);
  const openQuestionsCount = questions.filter((q) => q.status === 'open').length;

  // Plan user counts (正式模式僅統計真實用戶，無任何模擬虛報數據)
  const planUserCounts: Record<SubscriptionTier, number> = {
    free: availableUsers.filter((u) => !u.subscriptionTier || u.subscriptionTier === 'free').length + (isDemoMode ? 86 : 0),
    pro: availableUsers.filter((u) => u.subscriptionTier === 'pro').length + (isDemoMode ? 24 : 0),
    expert: availableUsers.filter((u) => u.subscriptionTier === 'expert').length + (isDemoMode ? 15 : 0),
    authority: availableUsers.filter((u) => u.subscriptionTier === 'authority').length + (isDemoMode ? 7 : 0),
    master: availableUsers.filter((u) => u.subscriptionTier === 'master').length + (isDemoMode ? 3 : 0),
  };

  const verifiedSolversCount = solvers.filter((s) => s.verifiedBadge).length;
  const totalRealUsersCount = availableUsers.filter((u) => isRealRegisteredUser(u)).length;
  const avgGMVPerUser = totalRealUsersCount > 0 ? Math.round(totalGMV / totalRealUsersCount) : 0;
  const avgPlatformFeePerUser = totalRealUsersCount > 0 ? Math.round(totalPlatformFees / totalRealUsersCount) : 0;

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
                  {isDemoMode ? '🧪 測試環境 (解封測試帳號與假資料)' : '🟢 正式營運模式 (僅保留核心測試帳號)'}
                </span>
                {isRaceMode && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-400 text-stone-950 border border-emerald-300 shadow-2xs">
                    🏎️ 競賽模式 (RACE)
                  </span>
                )}
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
                onClick={() => setPendingConfirm({ type: 'demo', nextState: !isDemoMode })}
                className={`px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md ${
                  isDemoMode
                    ? 'bg-amber-400 hover:bg-amber-300 text-stone-950 ring-2 ring-amber-300'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-stone-950 ring-2 ring-emerald-300'
                }`}
              >
                <RefreshCw className="w-4 h-4 text-stone-950" />
                <span>{isDemoMode ? '關閉【測試環境】' : '開啟【測試環境】'}</span>
              </button>

              {!isSimulatedDataPurged ? (
                <button
                  type="button"
                  onClick={() => setPendingConfirm({ type: 'clearMockData' })}
                  className="px-3.5 py-2.5 rounded-xl bg-rose-600/80 hover:bg-rose-600 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-rose-500/50"
                  title="一鍵自資料庫與瀏覽器徹底清除所有標記為 isSimulated 之模擬帳號、模擬貼文與模擬數據，僅保留真實資料"
                >
                  <Trash2 className="w-3.5 h-3.5 text-white" />
                  <span>一鍵刪除全部模擬資料 ({simulatedStats.simulatedQuestionsCount}篇/{simulatedStats.simulatedUsersCount}帳)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    restoreAllSimulatedData().then(() => {
                      setSaveMsg('✨ 已成功還原預設模擬帳號、模擬貼文與討論數據並同步至雲端資料庫！');
                      setTimeout(() => setSaveMsg(null), 4000);
                    });
                  }}
                  className="px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  title="還原預設模擬資料"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-stone-950" />
                  <span>還原模擬資料</span>
                </button>
              )}

            </div>
          </div>

          {/* 各身分測試帳號一覽 (Preserved Test Accounts) */}
          <div className="pt-3 border-t border-purple-800/40">
            <span className="text-[11px] font-bold text-purple-300 block mb-2">
              📌 系統固定保留之各身分測試帳號（點擊可快速切換身分進行功能驗證）：
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {[
                {
                  id: 'user-admin',
                  name: '站長・仲裁管理員',
                  roleName: '平台超級管理員',
                  desc: '具備爭議仲裁、違規審查、每日撥款配額與全站資料控制權',
                  badge: '👑 管理員',
                  badgeColor: 'bg-purple-500/30 text-purple-200 border-purple-400/40',
                },
                {
                  id: 'solver-1',
                  name: '柯育任 (認證專家)',
                  roleName: '官方認證專家解答者',
                  desc: '具備專家認證標籤、提交落地方案、應收帳款中心與專屬專家報價',
                  badge: '🏆 認證專家',
                  badgeColor: 'bg-blue-500/30 text-blue-200 border-blue-400/40',
                },
                {
                  id: 'user-questioner',
                  name: '林書豪 (企業發案者)',
                  roleName: '發案提問企業家',
                  desc: '發布問題懸賞、查看解鎖方案、三階段金流驗收與評價',
                  badge: '💼 提問發案者',
                  badgeColor: 'bg-amber-500/30 text-amber-200 border-amber-400/40',
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

        {/* 0.5 網站總瀏覽量與每日/每時瀏覽量折線圖 (UTC+8 台灣時間) */}
        <AdminSiteTrafficChart
          totalViewsCount={siteVisitsCount || 0}
          onlineUsersCount={onlineUsersCount || 1}
        />

        {/* 吉祥物互動統計 */}

        {/* 1. 平台獲利數據與核心運營指標 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-amber-600" />
              <span>平台獲利數據與即時運營總覽</span>
            </h3>
            <span className="text-[11px] text-stone-400 font-mono">即時統計</span>
          </div>

          <div className={`grid ${isNoPaymentMode ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'} gap-2.5 sm:gap-3 text-center`}>
            {!isNoPaymentMode && (
              <>
                <div className="p-3.5 sm:p-4 rounded-2xl bg-stone-50 border border-stone-200">
                  <span className="text-[11px] text-stone-500 font-bold block truncate">平台總交易額</span>
                  <span className="text-xl sm:text-2xl font-black text-stone-900 font-mono mt-1 block">
                    NT$ {(totalGMV || 0).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-stone-400 mt-0.5 block truncate">累計媒合總額</span>
                </div>

                <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50/60 border border-amber-200">
                  <span className="text-[11px] text-amber-800 font-bold block truncate">平台累計獲利 (淨抽成)</span>
                  <span className="text-xl sm:text-2xl font-black text-amber-700 font-mono mt-1 block">
                    NT$ {(totalPlatformFees || 0).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-amber-600 mt-0.5 block truncate">平台實收服務費</span>
                </div>
              </>
            )}

            <div className="p-3.5 sm:p-4 rounded-2xl bg-purple-50/80 border border-purple-200">
              <span className="text-[11px] text-purple-800 font-bold block truncate">累積打賞總額</span>
              <span className="text-xl sm:text-2xl font-black text-purple-700 font-mono mt-1 block">
                NT$ {(totalTipsSiteWide || 0).toLocaleString()}
              </span>
              <span className="text-[10px] text-purple-600 mt-0.5 block truncate" title="全站的所有人歷史打賞金流總和">
                全站歷史打賞金流總和
              </span>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-stone-50 border border-stone-200">
              <span className="text-[11px] text-stone-500 font-bold block truncate">平均用戶交易額</span>
              <span className="text-xl sm:text-2xl font-black text-stone-900 font-mono mt-1 block">
                NT$ {(avgGMVPerUser || 0).toLocaleString()}
              </span>
              <span className="text-[10px] text-stone-400 mt-0.5 block truncate">
                全站會員平均交易貢獻
              </span>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200">
              <span className="text-[11px] text-emerald-800 font-bold block truncate">平均用戶收益</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-700 font-mono mt-1 block">
                NT$ {(avgPlatformFeePerUser || 0).toLocaleString()}
              </span>
              <span className="text-[10px] text-emerald-600/90 mt-0.5 block truncate" title="平台從每個客戶賺的錢">
                平台從每個客戶賺的錢
              </span>
            </div>
          </div>
        </div>

        {/* 2. 首頁公開運營數據展示控制 (管理者自訂選擇要公開那些數據，可收合無畫線) */}
        <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-4">
          <div
            onClick={() => setIsPublicMetricsExpanded((prev) => !prev)}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer select-none group"
          >
            <div>
              <h4 className="font-extrabold text-sm sm:text-base text-amber-950 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-600" />
                <span>首頁公開運營數據展示控制（首頁看板開關）</span>
              </h4>
              <p className="text-xs text-amber-900/70 mt-0.5">
                管理者可勾選決定在首頁對外公開呈現的平台真實統計指標，點擊儲存後將同步至全站首頁。
              </p>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-200/80 text-amber-950 border border-amber-300 w-fit">
                已公開 {Object.values(localPublicMetrics).filter(Boolean).length} / 13 項指標
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPendingConfirm({ type: 'savePublicMetrics' });
                }}
                disabled={!hasPublicMetricsChanges}
                className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                  hasPublicMetricsChanges
                    ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-xs animate-pulse'
                    : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                }`}
              >
                <Save className="w-3.5 h-3.5" />
                <span>{hasPublicMetricsChanges ? '儲存看板公開設定' : '已儲存'}</span>
              </button>
              <button
                type="button"
                className="px-2.5 py-1.5 rounded-xl bg-white/80 hover:bg-white text-amber-900 border border-amber-300 text-xs font-bold flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
              >
                <span>{isPublicMetricsExpanded ? '收合' : '展開'}</span>
                {isPublicMetricsExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {isPublicMetricsExpanded && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 animate-in fade-in duration-200 pt-1">
            {/* Metric 1: 網站造訪量 */}
            <div className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
              localPublicMetrics.showTotalViews ? 'bg-white border-amber-300 shadow-2xs' : 'bg-stone-50/80 border-stone-200 opacity-60'
            }`}>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-xs text-stone-900">網站造訪量</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">造訪次數</span>
                </div>
                <p className="text-[11px] text-stone-500 mt-0.5">進入網站的總造訪次數</p>
              </div>
              <button
                type="button"
                onClick={() => setLocalPublicMetrics(prev => ({ ...prev, showTotalViews: !prev.showTotalViews }))}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                  localPublicMetrics.showTotalViews ? 'bg-amber-500' : 'bg-stone-300'
                }`}
                title={localPublicMetrics.showTotalViews ? '點擊關閉此指標' : '點擊開啟此指標'}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  localPublicMetrics.showTotalViews ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Metric 2: 線上人數 */}
            <div className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
              localPublicMetrics.showOnlineUsers ? 'bg-white border-amber-300 shadow-2xs' : 'bg-stone-50/80 border-stone-200 opacity-60'
            }`}>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-xs text-stone-900">線上人數</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">即時在線</span>
                </div>
                <p className="text-[11px] text-stone-500 mt-0.5">當前連線活躍瀏覽與互動人數</p>
              </div>
              <button
                type="button"
                onClick={() => setLocalPublicMetrics(prev => ({ ...prev, showOnlineUsers: !prev.showOnlineUsers }))}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                  localPublicMetrics.showOnlineUsers ? 'bg-amber-500' : 'bg-stone-300'
                }`}
                title={localPublicMetrics.showOnlineUsers ? '點擊關閉此指標' : '點擊開啟此指標'}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  localPublicMetrics.showOnlineUsers ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Metric 3: 總註冊用戶 */}
            <div className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
              localPublicMetrics.showTotalMembers ? 'bg-white border-amber-300 shadow-2xs' : 'bg-stone-50/80 border-stone-200 opacity-60'
            }`}>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-xs text-stone-900">總註冊用戶</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-100 text-purple-800">會員規模</span>
                </div>
                <p className="text-[11px] text-stone-500 mt-0.5">全站註冊會員總人數（提問方與專家）</p>
              </div>
              <button
                type="button"
                onClick={() => setLocalPublicMetrics(prev => ({ ...prev, showTotalMembers: !prev.showTotalMembers }))}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                  localPublicMetrics.showTotalMembers ? 'bg-amber-500' : 'bg-stone-300'
                }`}
                title={localPublicMetrics.showTotalMembers ? '點擊關閉此指標' : '點擊開啟此指標'}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  localPublicMetrics.showTotalMembers ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Metric 4: 認證專家 */}
            <div className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
              localPublicMetrics.showVerifiedSolvers ? 'bg-white border-amber-300 shadow-2xs' : 'bg-stone-50/80 border-stone-200 opacity-60'
            }`}>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-xs text-stone-900">認證專家</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-100 text-purple-800">智庫認證</span>
                </div>
                <p className="text-[11px] text-stone-500 mt-0.5">官方審核通過之認證專家智庫總數</p>
              </div>
              <button
                type="button"
                onClick={() => setLocalPublicMetrics(prev => ({ ...prev, showVerifiedSolvers: !prev.showVerifiedSolvers }))}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                  localPublicMetrics.showVerifiedSolvers ? 'bg-amber-500' : 'bg-stone-300'
                }`}
                title={localPublicMetrics.showVerifiedSolvers ? '點擊關閉此指標' : '點擊開啟此指標'}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  localPublicMetrics.showVerifiedSolvers ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Metric 5: 問題數量 */}
            <div className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
              localPublicMetrics.showQuestionsCount ? 'bg-white border-amber-300 shadow-2xs' : 'bg-stone-50/80 border-stone-200 opacity-60'
            }`}>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-xs text-stone-900">問題數量</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-100 text-blue-800">市場難題</span>
                </div>
                <p className="text-[11px] text-stone-500 mt-0.5">全站發布之公開懸賞與客製委託難題</p>
              </div>
              <button
                type="button"
                onClick={() => setLocalPublicMetrics(prev => ({ ...prev, showQuestionsCount: !prev.showQuestionsCount }))}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                  localPublicMetrics.showQuestionsCount ? 'bg-amber-500' : 'bg-stone-300'
                }`}
                title={localPublicMetrics.showQuestionsCount ? '點擊關閉此指標' : '點擊開啟此指標'}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  localPublicMetrics.showQuestionsCount ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Metric 6: 提案數量 */}
            <div className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
              localPublicMetrics.showProposalsCount ? 'bg-white border-amber-300 shadow-2xs' : 'bg-stone-50/80 border-stone-200 opacity-60'
            }`}>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-xs text-stone-900">提案數量</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">解方交付</span>
                </div>
                <p className="text-[11px] text-stone-500 mt-0.5">各領域專家提交之專業解題方案總數</p>
              </div>
              <button
                type="button"
                onClick={() => setLocalPublicMetrics(prev => ({ ...prev, showProposalsCount: !prev.showProposalsCount }))}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                  localPublicMetrics.showProposalsCount ? 'bg-amber-500' : 'bg-stone-300'
                }`}
                title={localPublicMetrics.showProposalsCount ? '點擊關閉此指標' : '點擊開啟此指標'}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  localPublicMetrics.showProposalsCount ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Metric 7: 累計解決難題 */}
            <div className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
              localPublicMetrics.showSolvedCount ? 'bg-white border-amber-300 shadow-2xs' : 'bg-stone-50/80 border-stone-200 opacity-60'
            }`}>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-xs text-stone-900">累計解決難題</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-stone-100 text-stone-600">已結案題數</span>
                </div>
                <p className="text-[11px] text-stone-500 mt-0.5">全站已結案問題與專家已採納方案總數</p>
              </div>
              <button
                type="button"
                onClick={() => setLocalPublicMetrics(prev => ({ ...prev, showSolvedCount: !prev.showSolvedCount }))}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                  localPublicMetrics.showSolvedCount ? 'bg-amber-500' : 'bg-stone-300'
                }`}
                title={localPublicMetrics.showSolvedCount ? '點擊關閉此指標' : '點擊開啟此指標'}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  localPublicMetrics.showSolvedCount ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Metric 8: 已成交方案 */}
            <div className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
              localPublicMetrics.showTotalDeals ? 'bg-white border-amber-300 shadow-2xs' : 'bg-stone-50/80 border-stone-200 opacity-60'
            }`}>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-xs text-stone-900">已成交方案</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">媒合成交</span>
                </div>
                <p className="text-[11px] text-stone-500 mt-0.5">全站問題提案採納與聊天室自訂提案成案總筆數</p>
              </div>
              <button
                type="button"
                onClick={() => setLocalPublicMetrics(prev => ({ ...prev, showTotalDeals: !prev.showTotalDeals }))}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                  localPublicMetrics.showTotalDeals ? 'bg-amber-500' : 'bg-stone-300'
                }`}
                title={localPublicMetrics.showTotalDeals ? '點擊關閉此指標' : '點擊開啟此指標'}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  localPublicMetrics.showTotalDeals ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Metric 9: 平台總交易額 */}
            <div className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
              localPublicMetrics.showTotalGMV ? 'bg-white border-amber-300 shadow-2xs' : 'bg-stone-50/80 border-stone-200 opacity-60'
            }`}>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-xs text-stone-900">平台總交易額</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-stone-100 text-stone-700">全站流水</span>
                </div>
                <p className="text-[11px] text-stone-500 mt-0.5">全站媒合交易與方案訂閱總流水</p>
              </div>
              <button
                type="button"
                onClick={() => setLocalPublicMetrics(prev => ({ ...prev, showTotalGMV: !prev.showTotalGMV }))}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                  localPublicMetrics.showTotalGMV ? 'bg-amber-500' : 'bg-stone-300'
                }`}
                title={localPublicMetrics.showTotalGMV ? '點擊關閉此指標' : '點擊開啟此指標'}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  localPublicMetrics.showTotalGMV ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Metric 10: 累計懸賞金額 */}
            <div className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
              localPublicMetrics.showTotalBounty ? 'bg-white border-amber-300 shadow-2xs' : 'bg-stone-50/80 border-stone-200 opacity-60'
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
                onClick={() => setLocalPublicMetrics(prev => ({ ...prev, showTotalBounty: !prev.showTotalBounty }))}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                  localPublicMetrics.showTotalBounty ? 'bg-amber-500' : 'bg-stone-300'
                }`}
                title={localPublicMetrics.showTotalBounty ? '點擊關閉此指標' : '點擊開啟此指標'}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  localPublicMetrics.showTotalBounty ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Metric 11: 平均回覆速度 */}
            <div className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
              localPublicMetrics.showAvgResponseSpeed ? 'bg-white border-amber-300 shadow-2xs' : 'bg-stone-50/80 border-stone-200 opacity-60'
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
                onClick={() => setLocalPublicMetrics(prev => ({ ...prev, showAvgResponseSpeed: !prev.showAvgResponseSpeed }))}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                  localPublicMetrics.showAvgResponseSpeed ? 'bg-amber-500' : 'bg-stone-300'
                }`}
                title={localPublicMetrics.showAvgResponseSpeed ? '點擊關閉此指標' : '點擊開啟此指標'}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  localPublicMetrics.showAvgResponseSpeed ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Metric 12: 方案採納滿意度 */}
            <div className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
              localPublicMetrics.showSatisfactionRate ? 'bg-white border-amber-300 shadow-2xs' : 'bg-stone-50/80 border-stone-200 opacity-60'
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
                onClick={() => setLocalPublicMetrics(prev => ({ ...prev, showSatisfactionRate: !prev.showSatisfactionRate }))}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                  localPublicMetrics.showSatisfactionRate ? 'bg-amber-500' : 'bg-stone-300'
                }`}
                title={localPublicMetrics.showSatisfactionRate ? '點擊關閉此指標' : '點擊開啟此指標'}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  localPublicMetrics.showSatisfactionRate ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Metric 13: 當前最高賞金 */}
            <div className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
              localPublicMetrics.showHighestBounty ? 'bg-white border-amber-300 shadow-2xs' : 'bg-stone-50/80 border-stone-200 opacity-60'
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
                onClick={() => setLocalPublicMetrics(prev => ({ ...prev, showHighestBounty: !prev.showHighestBounty }))}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                  localPublicMetrics.showHighestBounty ? 'bg-amber-500' : 'bg-stone-300'
                }`}
                title={localPublicMetrics.showHighestBounty ? '點擊關閉此指標' : '點擊開啟此指標'}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  localPublicMetrics.showHighestBounty ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>
          )}
        </div>


        {/* 4. 痛點過審、推薦碼、痛點採用全自動發放監控中心 (三軌自動化流水狀態) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-50/70 via-teal-50/50 to-amber-50/70 border border-emerald-300 space-y-3.5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-black flex items-center justify-center shrink-0 shadow-xs">
                <Zap className="w-4 h-4 fill-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black text-emerald-950">
                    痛點過審 • 推薦碼 • 痛點採用 全自動發放監控中心
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 text-[10px] font-bold border border-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    <span>三軌全自動發放中</span>
                  </span>
                </div>
                <p className="text-xs text-emerald-900/70 mt-0.5">
                  系統於審核通過或採納發生當下，自動完成金額撥付、點數入帳、站內信推播與交易流水記錄。
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-[11px] font-mono text-emerald-800 bg-white/80 px-2.5 py-1 rounded-xl border border-emerald-200">
                審計更新：{new Date(autoRewardStatus.lastAuditTime).toLocaleTimeString('zh-TW')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {/* 軌道 1: 痛點過審 */}
            <div className="p-3 rounded-xl bg-white border border-emerald-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-stone-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>1. 痛點過審自動化</span>
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                  200 點/案
                </span>
              </div>
              <p className="text-[11px] text-stone-500">提出生活/產業切身痛點通過審核，系統自動發放 200 點提問金（效期 60 日）。</p>
              <div className="pt-1.5 border-t border-stone-100 flex items-center justify-between text-[11px] font-mono">
                <span className="text-stone-400">累計自動配發：</span>
                <span className="font-bold text-emerald-700">{autoRewardStatus.painPointApproval.totalDistributedPoints.toLocaleString()} 點</span>
              </div>
            </div>

            {/* 軌道 2: 推薦碼 */}
            <div className="p-3 rounded-xl bg-white border border-emerald-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-stone-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>2. 推薦碼引導過審</span>
                </span>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                  300 點/案
                </span>
              </div>
              <p className="text-[11px] text-stone-500">引導之提案通過審核時，系統自動為推廣大使發放 300 點（價值 $400，效期 60 日）。</p>
              <div className="pt-1.5 border-t border-stone-100 flex items-center justify-between text-[11px] font-mono">
                <span className="text-stone-400">累計自動配發：</span>
                <span className="font-bold text-blue-700">{autoRewardStatus.referralCode.totalDistributedPoints.toLocaleString()} 點</span>
              </div>
            </div>

            {/* 軌道 3: 痛點採用 */}
            <div className="p-3 rounded-xl bg-white border border-emerald-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-stone-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>3. 痛點採用雙軌撥付</span>
                </span>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                  託管結算+好禮
                </span>
              </div>
              <p className="text-[11px] text-stone-500">問答採納自動安全託管拆款撥款；競賽入選方案採用痛點自動撥發 400~1,200 點好禮。</p>
              <div className="pt-1.5 border-t border-stone-100 flex items-center justify-between text-[11px] font-mono">
                <span className="text-stone-400">競賽採用好禮：</span>
                <span className="font-bold text-amber-700">{autoRewardStatus.painPointAdoption.totalDistributedPoints.toLocaleString()} 點</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. 核心基準平台抽成設定 (0% ~ 30%) */}
        <div className="p-5 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-sm sm:text-base text-purple-950 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-purple-600" />
                  <span>平台基準抽成比例設定（目前生效：{Math.round(commissionRate * 100)}%）</span>
                </h4>
                {isCommissionChanged && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-black border border-amber-300 animate-pulse">
                    待儲存 ➔ {sliderRate}%
                  </span>
                )}
              </div>
              <p className="text-xs text-purple-900/70 mt-0.5">
                僅管理者可配置，支援 0% ～ 30% 動態調整。需點擊「儲存基準抽成」並經過二次確認後正式套用。
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-2xl font-black text-purple-900 font-mono">{sliderRate}%</span>
              </div>
              <button
                type="button"
                onClick={() => setPendingConfirm({ type: 'saveBaseCommission' })}
                disabled={!isCommissionChanged}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                  isCommissionChanged
                    ? 'bg-purple-700 hover:bg-purple-600 text-white shadow-md active:scale-95'
                    : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                }`}
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isCommissionChanged ? '儲存基準抽成設定' : '已儲存'}</span>
              </button>
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
              onClick={() => setPendingConfirm({ type: 'saveFullCommissionAndPlans' })}
              className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer w-fit active:scale-95"
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
            {transactions.map((tx) => {
              const badge = getTransactionBadge(tx.type);
              return (
                <div key={tx.id} className="p-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-stone-900 flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${badge.bg}`}>
                        {tx.type}
                      </span>
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-stone-100 text-stone-600 font-mono">
                        {badge.category}
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
            );
          })}
          </div>
        </div>

        {/* 5. AI-CRM 巡航排程與客情策略控制 */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-50/70 via-orange-50/50 to-amber-50/70 border border-amber-200/80 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-sm sm:text-base text-stone-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>AI-CRM 定時巡航排程與客情策略控制</span>
                </h4>
                {hasAiCrmChanges && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-200 text-amber-900 text-[10px] font-black border border-amber-300 animate-pulse">
                    待儲存變更
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-600 mt-0.5">
                支援「按時段動態調整策略」與「固定間隔」巡航排程，依不同活躍時段自動調整掃描頻率，兼顧商機即時捕捉與算力成本。
              </p>
            </div>

            <button
              type="button"
              onClick={() => setPendingConfirm({ type: 'saveAiCrmConfig' })}
              disabled={!hasAiCrmChanges}
              className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                hasAiCrmChanges
                  ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-md active:scale-95'
                  : 'bg-stone-200 text-stone-400 cursor-not-allowed'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              <span>{hasAiCrmChanges ? '儲存巡航排程設定' : '已儲存'}</span>
            </button>
          </div>

          {/* 巡航模式選擇：按時段動態調整 vs 固定間隔 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setLocalAiCrmConfig(prev => ({ ...prev, scheduleMode: 'smart_time_slots' }))}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                localAiCrmConfig.scheduleMode === 'smart_time_slots'
                  ? 'bg-white border-amber-400 shadow-xs ring-2 ring-amber-300/40'
                  : 'bg-white/60 border-stone-200 hover:bg-white opacity-80'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs text-stone-900 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-amber-600" />
                  <span>按時段動態調整策略（推薦・黃金配置）</span>
                </span>
                {localAiCrmConfig.scheduleMode === 'smart_time_slots' && (
                  <CheckCircle2 className="w-4 h-4 text-amber-600" />
                )}
              </div>
              <p className="text-[11px] text-stone-500 mt-1 leading-relaxed">
                尖峰 1h 敏捷巡航、晚間 2h 深度分析、深夜 6h 節能深層重整。
              </p>
            </button>

            <button
              type="button"
              onClick={() => setLocalAiCrmConfig(prev => ({ ...prev, scheduleMode: 'fixed_interval' }))}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                localAiCrmConfig.scheduleMode === 'fixed_interval'
                  ? 'bg-white border-amber-400 shadow-xs ring-2 ring-amber-300/40'
                  : 'bg-white/60 border-stone-200 hover:bg-white opacity-80'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs text-stone-900 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-stone-600" />
                  <span>固定間隔巡航模式</span>
                </span>
                {localAiCrmConfig.scheduleMode === 'fixed_interval' && (
                  <CheckCircle2 className="w-4 h-4 text-amber-600" />
                )}
              </div>
              <p className="text-[11px] text-stone-500 mt-1 leading-relaxed">
                全天 24 小時維持單一固定頻率進行全站掃描分析。
              </p>
            </button>
          </div>

          {/* 時段參數配置 */}
          {localAiCrmConfig.scheduleMode === 'smart_time_slots' ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 日間尖峰 */}
              <div className="p-3 rounded-xl bg-white border border-emerald-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-950 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>日間商務活躍期</span>
                  </span>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800">
                    09:00 - 18:00
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[11px] text-stone-500 shrink-0">巡航間隔:</label>
                  <select
                    value={localAiCrmConfig.peakIntervalHours || 1}
                    onChange={(e) => setLocalAiCrmConfig(prev => ({ ...prev, peakIntervalHours: Number(e.target.value) }))}
                    className="w-full px-2 py-1 bg-stone-50 border border-emerald-300 rounded-lg text-xs font-bold font-mono cursor-pointer"
                  >
                    <option value={1}>每 1 小時 (敏捷推薦)</option>
                    <option value={2}>每 2 小時 (標準)</option>
                    <option value={3}>每 3 小時 (適中)</option>
                  </select>
                </div>
                <p className="text-[10px] text-stone-500">重心：即時鎖定新懸賞與比價猶豫</p>
              </div>

              {/* 晚間沉思 */}
              <div className="p-3 rounded-xl bg-white border border-amber-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-950 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>晚間決策沉思期</span>
                  </span>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800">
                    18:00 - 23:30
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[11px] text-stone-500 shrink-0">巡航間隔:</label>
                  <select
                    value={localAiCrmConfig.eveningIntervalHours || 2}
                    onChange={(e) => setLocalAiCrmConfig(prev => ({ ...prev, eveningIntervalHours: Number(e.target.value) }))}
                    className="w-full px-2 py-1 bg-stone-50 border border-amber-300 rounded-lg text-xs font-bold font-mono cursor-pointer"
                  >
                    <option value={1}>每 1 小時</option>
                    <option value={2}>每 2 小時 (黃金推薦)</option>
                    <option value={3}>每 3 小時</option>
                    <option value={4}>每 4 小時</option>
                  </select>
                </div>
                <p className="text-[10px] text-stone-500">重心：方案價值比對與預約諮詢引導</p>
              </div>

              {/* 深夜統整 */}
              <div className="p-3 rounded-xl bg-white border border-purple-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-950 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    <span>深夜離峰</span>
                  </span>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-800">
                    23:30 - 09:00
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[11px] text-stone-500 shrink-0">巡航間隔:</label>
                  <select
                    value={localAiCrmConfig.offPeakIntervalHours || 6}
                    onChange={(e) => setLocalAiCrmConfig(prev => ({ ...prev, offPeakIntervalHours: Number(e.target.value) }))}
                    className="w-full px-2 py-1 bg-stone-50 border border-purple-300 rounded-lg text-xs font-bold font-mono cursor-pointer"
                  >
                    <option value={4}>每 4 小時</option>
                    <option value={6}>每 6 小時 (節能推薦)</option>
                    <option value={8}>每 8 小時</option>
                  </select>
                </div>
                <p className="text-[10px] text-stone-500">重心：整理未解決問題，排定明早優先追蹤名單</p>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-white border border-stone-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-900">固定巡檢間隔</span>
                <span className="text-xs font-bold font-mono text-amber-700">每 {localAiCrmConfig.autoScanIntervalHours || 2} 小時</span>
              </div>
              <input
                type="range"
                min={1}
                max={12}
                step={1}
                value={localAiCrmConfig.autoScanIntervalHours || 2}
                onChange={(e) => setLocalAiCrmConfig(prev => ({ ...prev, autoScanIntervalHours: Number(e.target.value) }))}
                className="w-full accent-amber-600 cursor-pointer h-2 bg-stone-200 rounded-lg"
              />
            </div>
          )}

          {/* 商業門檻設定 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-white border border-stone-200 space-y-1">
              <span className="text-[11px] font-bold text-stone-700">提問者猶豫期判定門檻 (天數)</span>
              <input
                type="number"
                min={1}
                max={14}
                value={localAiCrmConfig.hesitationDaysThreshold || 3}
                onChange={(e) => setLocalAiCrmConfig(prev => ({ ...prev, hesitationDaysThreshold: Number(e.target.value) }))}
                className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono font-bold"
              />
            </div>

            <div className="p-3 rounded-xl bg-white border border-stone-200 space-y-1">
              <span className="text-[11px] font-bold text-stone-700">高意向懸賞金額門檻 (NT$)</span>
              <input
                type="number"
                min={500}
                step={500}
                value={localAiCrmConfig.highIntentBountyThreshold || 3000}
                onChange={(e) => setLocalAiCrmConfig(prev => ({ ...prev, highIntentBountyThreshold: Number(e.target.value) }))}
                className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono font-bold"
              />
            </div>
          </div>
        </div>

        {/* 5. 創星季競賽審核管理中心（參賽團隊報名審核、競賽提案審核與決選名次及痛點獎勵核定） */}
        <CompetitionAdminReviewTab
          onNotify={(title, message) => {
            setSaveMsg(`${title}：${message}`);
            setTimeout(() => setSaveMsg(null), 3500);
          }}
        />

        {/* 特殊環境開關 (共用相對開關 + 權限範圍) */}
        <div className="p-3.5 rounded-2xl bg-stone-900/90 border border-stone-800 text-stone-300 text-xs space-y-3">
          <div className="flex items-center justify-between border-b border-stone-800/80 pb-2">
            <div className="flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-bold text-stone-200 text-xs">特殊環境開關控制</span>
            </div>
            <span className="text-[10px] text-stone-400">
              運營模式全站生效 • 測試環境僅管理員視角
            </span>
          </div>

          {/* 四大平台運營模式切換：正式營運模式 (NORM) vs. 無金流模式 (FREE) vs. 測試環境 (TEST) vs. 競賽模式 (RACE) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-stone-300">平台運營模式（四選一專屬模式切換）</span>
              <span className="text-[10px] text-amber-400 font-mono font-bold">
                {isRaceMode ? '🏎️ RACE (競賽專屬)' : isDemoMode ? '🧪 TEST (測試環境)' : isNoPaymentMode ? '⚡ FREE (無金流)' : '🟢 NORM (正常營運)'}
              </span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-stone-950/80 rounded-xl border border-stone-800">
              {/* 🟢 正式營運模式 (NORM) */}
              <button
                type="button"
                onClick={() => {
                  if (isRaceMode || isNoPaymentMode || isDemoMode) {
                    setPendingConfirm({ type: 'liveOperation', nextState: true });
                  }
                }}
                className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  !isRaceMode && !isNoPaymentMode && !isDemoMode
                    ? 'bg-emerald-500 text-stone-950 shadow-md font-black ring-1 ring-emerald-300'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
                }`}
                title="切換至正常營運模式 (保留點數機制，純淨交易額)"
              >
                <span>🟢 正常營運</span>
                <span className="text-[9px] opacity-80 font-mono">(NORM)</span>
              </button>

              {/* ⚡ 無金流模式 (FREE) */}
              <button
                type="button"
                onClick={() => {
                  if (!isNoPaymentMode || isRaceMode || isDemoMode) {
                    setPendingConfirm({ type: 'noPayment', nextState: true });
                  }
                }}
                className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  !isRaceMode && isNoPaymentMode && !isDemoMode
                    ? 'bg-rose-500 text-white shadow-md font-black ring-1 ring-rose-400'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
                }`}
                title="切換至無金流模式 (全站免點數，隱藏金流)"
              >
                <span>⚡ 無金流</span>
                <span className="text-[9px] opacity-80 font-mono">(FREE)</span>
              </button>

              {/* 🧪 測試環境 (TEST) */}
              <button
                type="button"
                onClick={() => {
                  if (!isDemoMode || isRaceMode || isNoPaymentMode) {
                    setPendingConfirm({ type: 'demo', nextState: true });
                  }
                }}
                className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  !isRaceMode && isDemoMode
                    ? 'bg-amber-400 text-stone-950 shadow-md font-black ring-1 ring-amber-300'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
                }`}
                title="切換至測試環境 (解封模擬數據與測試帳號)"
              >
                <span>🧪 測試環境</span>
                <span className="text-[9px] opacity-80 font-mono">(TEST)</span>
              </button>

              {/* 🏎️ 競賽模式 (RACE) */}
              <button
                type="button"
                onClick={() => {
                  if (!isRaceMode) {
                    setPendingConfirm({ type: 'race', nextState: true });
                  }
                }}
                className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  isRaceMode
                    ? 'bg-emerald-400 text-stone-950 shadow-md font-black ring-1 ring-emerald-300'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
                }`}
                title="切換至競賽模式 (舊站提供創星季、創點子/痛點集與L0討論區專屬入口捷徑、獨立方案卡片與專屬網址)"
              >
                <span>🏎️ 競賽模式</span>
                <span className="text-[9px] opacity-80 font-mono">(RACE)</span>
              </button>
            </div>
          </div>

          {/* 當前模式說明與輔助設定 */}
          <div className="space-y-2 pt-1.5 border-t border-stone-800/60">
            {/* 競賽模式 (RACE) 狀態提示卡 */}
            {isRaceMode && (
              <div className="p-2.5 rounded-xl bg-emerald-950/50 border border-emerald-800/70 flex items-center gap-2">
                <span className="text-base shrink-0">🏎️</span>
                <div className="text-[11px] text-emerald-200 leading-tight">
                  <span className="font-bold text-white">競賽模式運作中：</span>
                  舊站提供創星季、創點子/痛點集與L0討論區專屬捷徑，痛點限定 L0 且標注綠色「創星季」標籤與獨立網址，方案以競賽卡片列出並可進獨立網頁；痛點依提案數/讚/觀看/討論排序。
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              {/* 測試環境（僅管理員畫面） */}
              <div className="p-2 rounded-lg bg-stone-950/60 border border-stone-800 flex items-center justify-between gap-1">
                <div className="flex flex-col">
                  <span className="font-bold text-stone-200 truncate">測試環境 (DEMO)</span>
                  <span className="text-[9px] text-stone-500">僅作用於管理員帳號</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingConfirm({ type: 'demo', nextState: !isDemoMode })}
                  className={`px-2 py-1 rounded text-[10px] font-bold shrink-0 transition-all cursor-pointer ${
                    isDemoMode
                      ? 'bg-amber-400 text-stone-950 hover:bg-amber-300'
                      : 'bg-stone-700 text-stone-100 hover:bg-stone-600'
                  }`}
                >
                  {isDemoMode ? '已開啟' : '開啟'}
                </button>
              </div>

              {/* 隱藏測試帳號 */}
              <div className="p-2 rounded-lg bg-stone-950/60 border border-stone-800 flex items-center justify-between gap-1">
                <div className="flex flex-col">
                  <span className="font-bold text-stone-200 truncate">測試帳號顯示</span>
                  <span className="text-[9px] text-stone-500">全站平台同步</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingConfirm({ type: 'hideTestAccounts', nextState: !isHideTestAccounts })}
                  className={`px-2 py-1 rounded text-[10px] font-bold shrink-0 transition-all cursor-pointer font-mono ${
                    isHideTestAccounts
                      ? 'bg-purple-400 text-stone-950 hover:bg-purple-300'
                      : 'bg-stone-700 text-stone-100 hover:bg-stone-600'
                  }`}
                >
                  {isHideTestAccounts ? 'HIDE' : 'SHOW'}
                </button>
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
                  {pendingConfirm.type === 'saveBaseCommission'
                    ? `確認儲存平台基準抽成比例為 ${sliderRate}%？`
                    : pendingConfirm.type === 'saveFullCommissionAndPlans'
                    ? '確認儲存全站抽成與方案設定？'
                    : pendingConfirm.type === 'savePublicMetrics'
                    ? '確認儲存首頁公開運營數據展示設定？'
                    : pendingConfirm.type === 'saveAiCrmConfig'
                    ? '確認儲存 AI-CRM 巡航排程與運營策略設定？'
                    : pendingConfirm.type === 'clearMockData'
                    ? '確認清除瀏覽器中的模擬示範資料？'
                    : pendingConfirm.type === 'liveOperation'
                    ? (pendingConfirm.nextState ? '確認開啟【正式營運模式】？' : '確認關閉【正式營運模式】？')
                    : pendingConfirm.type === 'race'
                    ? (pendingConfirm.nextState ? '確認開啟【競賽模式 (RACE)】？' : '確認關閉【競賽模式】？')
                    : pendingConfirm.type === 'demo'
                    ? (pendingConfirm.nextState ? '確認開啟【測試環境】？' : '確認關閉【測試環境】？')
                    : pendingConfirm.type === 'noPayment'
                    ? (pendingConfirm.nextState ? '確認開啟【無金流環境】？' : '確認關閉【無金流環境】？')
                    : (pendingConfirm.nextState ? '確認執行【隱藏測試帳號】？' : '確認執行【公開顯示 測試帳號】？')}
                </h3>
                <span className="text-[11px] text-stone-500 font-bold">
                  {pendingConfirm.type.startsWith('save')
                    ? '平台營運重要參數儲存二次確認'
                    : '系統運營底層模式變更二次確認'}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 text-xs text-stone-700 leading-relaxed">
              {pendingConfirm.type === 'saveBaseCommission' && (
                <div>
                  <p className="font-bold text-stone-900 mb-1">
                    平台基準抽成率將從 {Math.round(commissionRate * 100)}% 調整為 {sliderRate}%：
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-stone-600 text-[11px]">
                    <li>即時套用於全站所有解鎖、懸賞結算與專家客製報價清算。</li>
                    <li>一般會員與未減免方案將統一按 {sliderRate}% 計算平台服務費。</li>
                  </ul>
                </div>
              )}
              {pendingConfirm.type === 'saveFullCommissionAndPlans' && (
                <div>
                  <p className="font-bold text-stone-900 mb-1">
                    即將同步更新基準抽成（{sliderRate}%）及各等級會員月費與減免率：
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-stone-600 text-[11px]">
                    <li>達人級 (Pro): 月費 NT$ {editablePlans.pro.monthlyPrice} / 減免 {editablePlans.pro.rebatePercent}%</li>
                    <li>專家級 (Expert): 月費 NT$ {editablePlans.expert.monthlyPrice} / 減免 {editablePlans.expert.rebatePercent}%</li>
                    <li>權威級 (Authority): 月費 NT$ {editablePlans.authority.monthlyPrice} / 減免 {editablePlans.authority.rebatePercent}%</li>
                    <li>大師級 (Master): 月費 NT$ {editablePlans.master.monthlyPrice} / 減免 {editablePlans.master.rebatePercent}%</li>
                  </ul>
                </div>
              )}
              {pendingConfirm.type === 'savePublicMetrics' && (
                <div>
                  <p className="font-bold text-stone-900 mb-1">
                    首頁公開指標展示將更新為目前勾選之 {Object.values(localPublicMetrics).filter(Boolean).length} 項指標：
                  </p>
                  <p className="text-stone-600 text-[11px]">
                    設定儲存後將即時同步至首頁即時運營數據看板。
                  </p>
                </div>
              )}
              {pendingConfirm.type === 'saveAiCrmConfig' && (
                <div>
                  <p className="font-bold text-stone-900 mb-1">
                    即將更新全站 AI-CRM 定時巡航排程與運營策略：
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-stone-600 text-[11px]">
                    {localAiCrmConfig.scheduleMode === 'smart_time_slots' ? (
                      <>
                        <li>採用【按時段動態調整策略】（推薦黃金配置）</li>
                        <li>日間商務活躍期 (09:00 - 18:00)：每 {localAiCrmConfig.peakIntervalHours || 1} 小時巡航</li>
                        <li>晚間決策沉思期 (18:00 - 23:30)：每 {localAiCrmConfig.eveningIntervalHours || 2} 小時巡航</li>
                        <li>深夜離峰 (23:30 - 09:00)：每 {localAiCrmConfig.offPeakIntervalHours || 6} 小時深層運算</li>
                      </>
                    ) : (
                      <li>採用【固定間隔巡航】：全天候每 {localAiCrmConfig.autoScanIntervalHours || 2} 小時固定巡檢</li>
                    )}
                    <li>提問者猶豫期判定：{localAiCrmConfig.hesitationDaysThreshold || 3} 天</li>
                    <li>高意向懸賞門檻：NT$ {(localAiCrmConfig.highIntentBountyThreshold || 3000).toLocaleString()}</li>
                  </ul>
                </div>
              )}
              {pendingConfirm.type === 'clearMockData' && (
                <p>
                  即將自本機與 Firebase Cloud Firestore 雲端資料庫一鍵刪除所有標記為 <code className="font-mono">isSimulated: true</code> 之模擬帳號（{simulatedStats.simulatedUsersCount} 位）、模擬貼文/方案（{simulatedStats.simulatedQuestionsCount} 篇）、模擬討論留言（{simulatedStats.simulatedAnswersCount} 則）與模擬打賞數據。所有真實註冊帳號與真實發布內容均完整保留不受影響。
                </p>
              )}
              {pendingConfirm.type === 'liveOperation' && (
                pendingConfirm.nextState
                  ? '即將開啟【正式營運模式】：（全站平台同步生效）系統將自動關閉無金流模式並隱藏所有測試帳號與模擬資料，全平台恢復真實數據，同步啟用標準商業金流與履約託管機制。'
                  : '即將關閉【正式營運模式】：（全站平台同步生效）系統將相對地自動切換為【無金流模式】，並持續隱藏測試環境模擬資料與測試帳號。'
              )}
              {pendingConfirm.type === 'race' && (
                pendingConfirm.nextState
                  ? '即將開啟【競賽模式 (RACE)】：（全站平台同步生效）舊站問題市場將提供「創點子/痛點集」與「L0討論區」主題捷徑，痛點限定 L0 且標注綠色「創星季」標籤與獨立網址，方案以競賽圖文卡片展示並含獨立網址；頁尾同步顯示 RACE 簡稱。本模式與正式營運、無金流、測試環境為四選一互斥。'
                  : '即將關閉【競賽模式】：系統將自動切換為【正式營運模式 (NORM)】。'
              )}
              {pendingConfirm.type === 'demo' && (
                pendingConfirm.nextState
                  ? '即將開啟【測試環境】：（僅作用於管理員帳號視角）管理員畫面將載入預設示範問題、提案與專家數據，不影響外部真實會員與訪客。'
                  : '即將關閉【測試環境】：（僅作用於管理員帳號視角）管理員畫面將恢復純淨實時平台真實數據。'
              )}
              {pendingConfirm.type === 'noPayment' && (
                pendingConfirm.nextState
                  ? '即將開啟【無金流模式】：（全站平台同步生效）系統將自動關閉正式營運模式，隱藏所有測試帳號與模擬資料，全平台恢復真實數據；所有用戶帳號均無點數、儲值與金流相關設定，開放全站免費提問與互動。'
                  : '即將關閉【無金流模式】：（全站平台同步生效）系統將相對地自動切換為【正式營運模式】，恢復標準商業金流機制，並持續隱藏測試環境模擬資料與測試帳號。'
              )}
              {pendingConfirm.type === 'hideTestAccounts' && (
                pendingConfirm.nextState
                  ? '即將在全站用戶列表與切換帳號選單中隱藏林書豪、陳怡君與訪客等測試帳號，僅保留超級管理員與真實註冊用戶。'
                  : '即將公開顯示測試帳號（林書豪、陳怡君、訪客等），並自動關閉正式營運模式。'
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
                onClick={handleConfirmAction}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs ${
                  pendingConfirm.type === 'clearMockData'
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : pendingConfirm.type.startsWith('save')
                    ? 'bg-purple-700 hover:bg-purple-600 text-white'
                    : pendingConfirm.nextState
                    ? 'bg-amber-500 hover:bg-amber-400 text-stone-950'
                    : 'bg-stone-900 hover:bg-stone-800 text-white'
                }`}
              >
                {pendingConfirm.type.startsWith('save')
                  ? '確認儲存'
                  : pendingConfirm.type === 'clearMockData'
                  ? '確認清除'
                  : `確認${pendingConfirm.nextState ? (pendingConfirm.type === 'hideTestAccounts' ? '隱藏' : '開啟') : (pendingConfirm.type === 'hideTestAccounts' ? '公開' : '關閉')}`}
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

      {/* 平台版本號與最近更新時間與當前環境簡稱 (純英文與數字，以連字號連接至少兩個英文標籤) */}
      <div className="py-2.5 text-center bg-stone-50/50 border-t border-stone-200/60 text-[10px] sm:text-[11px] text-stone-400 font-mono tracking-tight select-none">
        v{APP_VERSION} • {APP_RELEASE_DATE} • {isRaceMode ? 'RACE' : isDemoMode ? 'TEST' : isNoPaymentMode ? 'FREE' : 'NORM'}-{isHideTestAccounts ? 'HIDE' : 'SHOW'}
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

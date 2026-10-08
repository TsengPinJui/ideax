import React, { useState, useEffect } from 'react';
import {
  Award,
  CheckCircle2,
  XCircle,
  FileText,
  ExternalLink,
  Users,
  GraduationCap,
  Sparkles,
  Search,
  Filter,
  Check,
  X,
  MessageSquare,
  Heart,
  Coins,
  AlertCircle,
  Clock,
  ShieldCheck,
  ChevronDown,
  Gift,
  Flame,
  BarChart3,
  Eye,
  EyeOff,
  Settings,
  Sliders,
  TrendingUp,
  RefreshCw,
  Share2,
  Trophy,
  Folder,
  Zap,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { syncUserToFirestore } from '../services/firestoreSync';
import {
  distributePainPointApprovalReward,
  distributeReferralApprovalReward,
  distributePainPointAdoptionReward,
  getAutomatedDistributionStatus,
  AutomatedDistributionStatus,
} from '../services/rewardAutomationService';
import { AdminCompetitionRulesArchiveFolder } from './challenge/AdminCompetitionRulesArchiveFolder';
import {
  CompetitionRegistrationRecord,
  getCompetitionRegistrations,
  updateCompetitionRegistrationStatus,
  getCompetitionProposalsForAdmin,
  updateCompetitionProposalReviewStatus,
  updateCompetitionProposalAward,
  CompetitionExpertRecord,
  getCompetitionExperts,
  updateCompetitionExpertStatus,
  getCompetitionHomepageStatsConfig,
  saveCompetitionHomepageStatsConfig,
  getCompetitionAggregatedMetrics,
  resetCompetitionDataToZero,
} from '../services/competitionAdminSync';
import {
  StarSeasonProposal,
  STAR_SEASON_TRACKS,
  CompetitionHomepageStatsConfig,
  CompetitionAdminMetrics,
  DEFAULT_HOMEPAGE_STATS_CONFIG,
} from '../types/competition';

interface CompetitionAdminReviewTabProps {
  onNotify?: (title: string, message: string) => void;
}

export const CompetitionAdminReviewTab: React.FC<CompetitionAdminReviewTabProps> = ({ onNotify }) => {
  const {
    availableUsers,
    setAvailableUsers,
    currentUser,
    setCurrentUser,
    setTransactions,
    addNotification,
  } = useApp();

  const [subTab, setSubTab] = useState<'metrics' | 'registrations' | 'experts' | 'proposals' | 'awards' | 'rules_archive'>('metrics');
  const [registrations, setRegistrations] = useState<CompetitionRegistrationRecord[]>([]);
  const [proposals, setProposals] = useState<StarSeasonProposal[]>([]);
  const [experts, setExperts] = useState<CompetitionExpertRecord[]>([]);
  const [statsConfig, setStatsConfig] = useState<CompetitionHomepageStatsConfig>(() => getCompetitionHomepageStatsConfig());
  const [adminMetrics, setAdminMetrics] = useState<CompetitionAdminMetrics>(() => getCompetitionAggregatedMetrics());
  const [autoRewardStatus, setAutoRewardStatus] = useState<AutomatedDistributionStatus>(() => getAutomatedDistributionStatus());
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Review note modal
  const [activeReviewNoteModal, setActiveReviewNoteModal] = useState<{
    id: string;
    type: 'reg' | 'prop' | 'expert';
    title: string;
    targetStatus: 'approved' | 'rejected';
  } | null>(null);
  const [noteInput, setNoteInput] = useState<string>('');

  const loadAll = () => {
    setRegistrations(getCompetitionRegistrations());
    setProposals(getCompetitionProposalsForAdmin());
    setExperts(getCompetitionExperts());
    setStatsConfig(getCompetitionHomepageStatsConfig());
    setAdminMetrics(getCompetitionAggregatedMetrics());
    setAutoRewardStatus(getAutomatedDistributionStatus());
  };

  useEffect(() => {
    loadAll();
  }, []);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // 1. 審核報名
  const handleReviewReg = (id: string, status: 'approved' | 'rejected', defaultNote?: string) => {
    const success = updateCompetitionRegistrationStatus(
      id,
      status,
      defaultNote || (status === 'approved' ? '審核通過，准予進入競賽專案庫' : '資料未齊全，請修正後再次送審')
    );
    if (success) {
      loadAll();
      triggerToast(status === 'approved' ? '✅ 已核准該團隊參賽報名！' : '❌ 已退回該參賽報名。');
      if (onNotify) {
        onNotify('創星季審核通知', status === 'approved' ? '已核准團隊參賽報名' : '已退回參賽報名');
      }
    }
  };

  // 2. 審核專家申請
  const handleReviewExpert = (id: string, status: 'approved' | 'rejected', isJudgeSelected = false, defaultNote?: string) => {
    const success = updateCompetitionExpertStatus(
      id,
      status,
      isJudgeSelected,
      defaultNote || (status === 'approved' ? '專家身分審核通過，已配發 3,000,000 創星幣！' : '專家證明資料未通過')
    );
    if (success) {
      loadAll();
      triggerToast(status === 'approved' ? '✅ 已核准專家資格，已自動配發 3,000,000 創星幣！' : '❌ 已退回該專家申請。');
      if (onNotify) {
        onNotify('創星季專家審核', status === 'approved' ? '已核准專家身分並配發 3,000,000 創星幣' : '已退回專家申請');
      }
    }
  };

  // 3. 審核提案
  const handleReviewProp = (proposalId: string, status: 'approved' | 'rejected', defaultNote?: string) => {
    const success = updateCompetitionProposalReviewStatus(
      proposalId,
      status,
      defaultNote || (status === 'approved' ? '提案審核通過' : '提案未通過')
    );
    if (success) {
      // 若審核通過且有填寫推薦碼，自動為推薦大使發放 300 點獎勵（價值 $400，效期 60 日）！
      if (status === 'approved') {
        const targetProp = proposals.find((p) => p.id === proposalId);
        if (targetProp && targetProp.ambassadorCode) {
          const autoRes = distributeReferralApprovalReward({
            proposalId: targetProp.id,
            proposalTitle: targetProp.title,
            ambassadorCode: targetProp.ambassadorCode,
            proposerName: targetProp.authorName,
            availableUsers,
            setAvailableUsers,
            currentUser,
            setCurrentUser,
            setTransactions,
            addNotification,
            syncUserToFirestore,
          });
          if (autoRes.success) {
            triggerToast(`✅ 已核准提案！${autoRes.message}`);
          }
        }
      }
      loadAll();
      triggerToast(status === 'approved' ? '✅ 已核准該競賽提案！' : '❌ 已退回該提案。');
    }
  };

  // 4. 核定名次與痛點獎勵
  const handleAward = (proposalId: string, rank: number, adoptedApproved: boolean) => {
    const success = updateCompetitionProposalAward(proposalId, rank, true, adoptedApproved);
    if (success) {
      // 若核准痛點採用獎勵，系統自動為原痛點提出者發放好禮提問金（前三名 1,200 點、其餘 400 點，效期 60 日）！
      if (adoptedApproved) {
        const targetProp = proposals.find((p) => p.id === proposalId);
        if (targetProp && targetProp.sourcePainPointTitle) {
          const autoRes = distributePainPointAdoptionReward({
            proposalId: targetProp.id,
            proposalTitle: targetProp.title,
            sourcePainPointTitle: targetProp.sourcePainPointTitle,
            rank,
            availableUsers,
            setAvailableUsers,
            currentUser,
            setCurrentUser,
            setTransactions,
            addNotification,
            syncUserToFirestore,
          });
          if (autoRes.success) {
            triggerToast(`🏆 痛點採用獎勵核定成功！${autoRes.message}`);
          }
        }
      }
      loadAll();
      triggerToast(`🏆 已成功核定名次（第 ${rank} 名）與獎勵撥付審核狀態！`);
    }
  };

  // 5. 儲存首頁展示配置
  const handleToggleStatsConfig = (key: keyof CompetitionHomepageStatsConfig) => {
    const nextConfig = {
      ...statsConfig,
      [key]: !statsConfig[key],
    };
    setStatsConfig(nextConfig);
    saveCompetitionHomepageStatsConfig(nextConfig);
    triggerToast(`⚙️ 已更新首頁展示設定：${key} 已切換為 ${nextConfig[key] ? '公開' : '隱藏'}`);
  };

  const handleSetAllStatsConfig = (showAll: boolean) => {
    const nextConfig: CompetitionHomepageStatsConfig = {
      showLoggedInUsers: showAll,
      showParticipants: showAll,
      showExperts: showAll,
      showProposals: showAll,
      showPainPoints: showAll,
      showAllocatedPoints: showAll,
    };
    setStatsConfig(nextConfig);
    saveCompetitionHomepageStatsConfig(nextConfig);
    triggerToast(showAll ? '✅ 已將所有 6 項數據公開於競賽網首頁！' : '🔒 已隱藏首頁所有自選數據指標。');
  };

  // 一鍵數據歸零
  const handleResetDataToZero = () => {
    resetCompetitionDataToZero();
    loadAll();
    triggerToast('🧹 已成功將全站競賽數據清零！所有計數器回歸 0。');
  };

  // 統計數據
  const pendingRegsCount = registrations.filter((r) => r.status === 'pending_review').length;
  const pendingPropsCount = proposals.filter((p) => p.status === 'pending_review').length;
  const pendingExpertsCount = experts.filter((e) => e.status === 'pending_review').length;

  const filteredRegistrations = registrations.filter((r) => {
    if (statusFilter === 'pending' && r.status !== 'pending_review') return false;
    if (statusFilter === 'approved' && r.status !== 'approved') return false;
    if (statusFilter === 'rejected' && r.status !== 'rejected') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTeam = r.teamName.toLowerCase().includes(q);
      const matchLeader = r.leaderName.toLowerCase().includes(q);
      const matchSchool = r.schoolName.toLowerCase().includes(q);
      const matchTitle = (r.projectTitle || '').toLowerCase().includes(q);
      return matchTeam || matchLeader || matchSchool || matchTitle;
    }
    return true;
  });

  const filteredExperts = experts.filter((e) => {
    if (statusFilter === 'pending' && e.status !== 'pending_review') return false;
    if (statusFilter === 'approved' && e.status !== 'approved') return false;
    if (statusFilter === 'rejected' && e.status !== 'rejected') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = e.expertName.toLowerCase().includes(q);
      const matchOrg = e.organization.toLowerCase().includes(q);
      const matchTitle = e.jobTitle.toLowerCase().includes(q);
      return matchName || matchOrg || matchTitle;
    }
    return true;
  });

  const filteredProposals = proposals.filter((p) => {
    if (statusFilter === 'pending' && p.status !== 'pending_review') return false;
    if (statusFilter === 'approved' && p.status !== 'approved') return false;
    if (statusFilter === 'rejected' && p.status !== 'rejected') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = p.title.toLowerCase().includes(q);
      const matchAuthor = p.authorName.toLowerCase().includes(q);
      return matchTitle || matchAuthor;
    }
    return true;
  });

  return (
    <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-950/20 via-stone-900 to-amber-950/20 border-2 border-emerald-500/40 text-stone-900 shadow-md space-y-5">
      {/* 頂部標題與即時通知 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-sm sm:text-base text-stone-900 flex items-center gap-1.5">
                <span>IdeaX 創星季競賽後台管理中心</span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  賽事治理
                </span>
              </h3>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              即時掌握競賽數據、審核參賽者與專家資格、提案審核及設定首頁公開展示指標。
            </p>
          </div>
        </div>

        {/* 提示訊息與數據清零按鈕 */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetDataToZero}
            className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-98"
            title="將全站競賽數據歸零重設"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>數據清零</span>
          </button>
          {toastMsg && (
            <span className="px-3 py-1 rounded-xl bg-emerald-600 text-white text-xs font-bold animate-in fade-in duration-200 shrink-0">
              {toastMsg}
            </span>
          )}
        </div>
      </div>

      {/* 📊 頂部 6 大即時指標快報列 (點擊可直接切換) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-left">
        {/* 1. 登入用戶數 */}
        <div className="bg-white p-3 rounded-2xl border border-stone-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-stone-600">登入用戶數</span>
            <Users className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-black text-stone-900 font-mono">
              {adminMetrics.loggedInUsersCount}
            </span>
            <span className="text-[10px] text-stone-400">人</span>
          </div>
          <div className="text-[9px] text-stone-400 mt-0.5 flex items-center gap-1">
            {statsConfig.showLoggedInUsers ? (
              <span className="text-emerald-700 font-bold">● 首頁已公開</span>
            ) : (
              <span className="text-stone-400">○ 首頁已隱藏</span>
            )}
          </div>
        </div>

        {/* 2. 參賽者數 */}
        <div className="bg-white p-3 rounded-2xl border border-stone-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-stone-600">參賽團隊數</span>
            <GraduationCap className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-black text-stone-900 font-mono">
              {adminMetrics.participantsCount}
            </span>
            <span className="text-[10px] text-stone-400">隊</span>
            {pendingRegsCount > 0 && (
              <span className="ml-1 text-[9px] px-1 py-0.2 rounded bg-rose-100 text-rose-700 font-bold">
                {pendingRegsCount} 待審
              </span>
            )}
          </div>
          <div className="text-[9px] text-stone-400 mt-0.5 flex items-center gap-1">
            {statsConfig.showParticipants ? (
              <span className="text-emerald-700 font-bold">● 首頁已公開</span>
            ) : (
              <span className="text-stone-400">○ 首頁已隱藏</span>
            )}
          </div>
        </div>

        {/* 3. 專家數 */}
        <div className="bg-white p-3 rounded-2xl border border-stone-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-stone-600">專家數</span>
            <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-black text-purple-700 font-mono">
              {adminMetrics.approvedExpertsCount}
            </span>
            <span className="text-[10px] text-stone-400">位 (共{adminMetrics.expertsCount})</span>
          </div>
          <div className="text-[9px] text-stone-400 mt-0.5 flex items-center gap-1">
            {statsConfig.showExperts ? (
              <span className="text-emerald-700 font-bold">● 首頁已公開</span>
            ) : (
              <span className="text-stone-400">○ 首頁已隱藏</span>
            )}
          </div>
        </div>

        {/* 4. 提案數 */}
        <div className="bg-white p-3 rounded-2xl border border-stone-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-stone-600">創新提案數</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-black text-stone-900 font-mono">
              {adminMetrics.proposalsCount}
            </span>
            <span className="text-[10px] text-stone-400">件</span>
            {pendingPropsCount > 0 && (
              <span className="ml-1 text-[9px] px-1 py-0.2 rounded bg-rose-100 text-rose-700 font-bold">
                {pendingPropsCount} 待審
              </span>
            )}
          </div>
          <div className="text-[9px] text-stone-400 mt-0.5 flex items-center gap-1">
            {statsConfig.showProposals ? (
              <span className="text-emerald-700 font-bold">● 首頁已公開</span>
            ) : (
              <span className="text-stone-400">○ 首頁已隱藏</span>
            )}
          </div>
        </div>

        {/* 5. 痛點數 */}
        <div className="bg-white p-3 rounded-2xl border border-stone-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-stone-600">切身痛點數</span>
            <Flame className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-black text-rose-600 font-mono">
              {adminMetrics.painPointsCount}
            </span>
            <span className="text-[10px] text-stone-400">題</span>
          </div>
          <div className="text-[9px] text-stone-400 mt-0.5 flex items-center gap-1">
            {statsConfig.showPainPoints ? (
              <span className="text-emerald-700 font-bold">● 首頁已公開</span>
            ) : (
              <span className="text-stone-400">○ 首頁已隱藏</span>
            )}
          </div>
        </div>

        {/* 6. 已配發點數總額 */}
        <div className="bg-white p-3 rounded-2xl border border-stone-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-stone-600">已配發點數</span>
            <Coins className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-lg font-black text-amber-600 font-mono truncate" title={`${adminMetrics.totalAllocatedPoints.toLocaleString()} 點`}>
              ${(adminMetrics.totalAllocatedPoints / 10000).toFixed(0)}萬
            </span>
          </div>
          <div className="text-[9px] text-stone-400 mt-0.5 flex items-center gap-1">
            {statsConfig.showAllocatedPoints ? (
              <span className="text-emerald-700 font-bold">● 首頁已公開</span>
            ) : (
              <span className="text-stone-400">○ 首頁已隱藏</span>
            )}
          </div>
        </div>
      </div>

      {/* 次導覽 Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-200/60 pt-3">
        <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-2xl border border-stone-200 flex-wrap">
          {/* 數據總覽與首頁設定 */}
          <button
            type="button"
            onClick={() => setSubTab('metrics')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              subTab === 'metrics'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>數據總覽與首頁公開設定</span>
          </button>

          {/* 參賽團隊審核 */}
          <button
            type="button"
            onClick={() => setSubTab('registrations')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              subTab === 'registrations'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>參賽團隊報名審核</span>
            {pendingRegsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-black">
                {pendingRegsCount}
              </span>
            )}
          </button>

          {/* 專家審核 */}
          <button
            type="button"
            onClick={() => setSubTab('experts')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              subTab === 'experts'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>專家審核 (配發300萬點)</span>
            {pendingExpertsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-purple-600 text-white text-[10px] font-black">
                {pendingExpertsCount}
              </span>
            )}
          </button>

          {/* 提案審核 */}
          <button
            type="button"
            onClick={() => setSubTab('proposals')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              subTab === 'proposals'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>競賽提案審核</span>
            {pendingPropsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-black">
                {pendingPropsCount}
              </span>
            )}
          </button>

          {/* 決選名次與獎勵 */}
          <button
            type="button"
            onClick={() => setSubTab('awards')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              subTab === 'awards'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>決選名次與痛點採用獎勵</span>
          </button>

          {/* 規章條款封存資料夾（管理員專屬打包存檔） */}
          <button
            type="button"
            onClick={() => setSubTab('rules_archive')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              subTab === 'rules_archive'
                ? 'bg-amber-400 text-stone-950 font-black shadow-2xs ring-2 ring-amber-500/30'
                : 'text-stone-700 hover:text-stone-950 hover:bg-stone-200/60'
            }`}
            title="查看僅超級管理員可見之全套官方規章條款與辦法歸檔資料夾"
          >
            <Folder className="w-3.5 h-3.5 text-amber-600" />
            <span>📁 規章條款存檔資料夾</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-stone-950 text-amber-300 font-mono font-black">
              機密
            </span>
          </button>
        </div>

        {/* 搜尋與狀態過濾器 (在非 metrics、非 awards、非 rules_archive 頁顯示) */}
        {subTab !== 'metrics' && subTab !== 'awards' && subTab !== 'rules_archive' && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="搜尋姓名、機構或主題..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-white border border-stone-200 rounded-xl text-xs text-stone-800 placeholder-stone-400 outline-none focus:border-emerald-500 w-44"
              />
            </div>
            <div className="flex items-center gap-1 bg-white p-0.5 rounded-xl border border-stone-200 text-xs">
              {(['all', 'pending', 'approved', 'rejected'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                    statusFilter === st
                      ? 'bg-stone-900 text-white'
                      : 'text-stone-500 hover:text-stone-900'
                  }`}
                >
                  {st === 'all' ? '全部' : st === 'pending' ? '待審核' : st === 'approved' ? '已核准' : '退回'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SUB-VIEW 0: 📊 數據總覽與首頁公開設定 (Metrics & Visibility Config) */}
      {/* ========================================================================= */}
      {subTab === 'metrics' && (
        <div className="space-y-5">
          {/* 🎛️ 首頁公開數據開關控制台 */}
          <div className="p-5 rounded-3xl bg-white border border-emerald-300/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
              <div>
                <h4 className="text-sm sm:text-base font-black text-stone-900 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-600" />
                  <span>競賽網首頁數據展示開關（選擇要公開哪些數據）</span>
                </h4>
                <p className="text-xs text-stone-500 mt-0.5">
                  勾選的數據將即時顯示於競賽官網首頁。未勾選的指標將自動隱藏，保護內部數據隱私。
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSetAllStatsConfig(true)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>全部公開</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSetAllStatsConfig(false)}
                  className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>全部隱藏</span>
                </button>
              </div>
            </div>

            {/* 6 個指標獨立開關面板 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* 1. 登入用戶數 */}
              <label
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 select-none ${
                  statsConfig.showLoggedInUsers
                    ? 'bg-emerald-50/50 border-emerald-500 shadow-2xs'
                    : 'bg-stone-50 border-stone-200 opacity-75'
                }`}
              >
                <input
                  type="checkbox"
                  checked={statsConfig.showLoggedInUsers}
                  onChange={() => handleToggleStatsConfig('showLoggedInUsers')}
                  className="mt-0.5 w-4 h-4 text-emerald-600 rounded cursor-pointer accent-emerald-600"
                />
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-stone-900">公開「登入用戶數」</span>
                    <span className="font-mono text-xs font-black text-blue-600">{adminMetrics.loggedInUsersCount} 人</span>
                  </div>
                  <p className="text-[11px] text-stone-500 leading-snug">
                    展示全站登入與參與投票的會員總人數。
                  </p>
                </div>
              </label>

              {/* 2. 參賽者數 */}
              <label
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 select-none ${
                  statsConfig.showParticipants
                    ? 'bg-emerald-50/50 border-emerald-500 shadow-2xs'
                    : 'bg-stone-50 border-stone-200 opacity-75'
                }`}
              >
                <input
                  type="checkbox"
                  checked={statsConfig.showParticipants}
                  onChange={() => handleToggleStatsConfig('showParticipants')}
                  className="mt-0.5 w-4 h-4 text-emerald-600 rounded cursor-pointer accent-emerald-600"
                />
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-stone-900">公開「參賽者數」</span>
                    <span className="font-mono text-xs font-black text-emerald-600">{adminMetrics.participantsCount} 隊</span>
                  </div>
                  <p className="text-[11px] text-stone-500 leading-snug">
                    展示已報名參賽團隊數（通過 {adminMetrics.approvedParticipantsCount} 隊）。
                  </p>
                </div>
              </label>

              {/* 3. 專家數 */}
              <label
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 select-none ${
                  statsConfig.showExperts
                    ? 'bg-emerald-50/50 border-emerald-500 shadow-2xs'
                    : 'bg-stone-50 border-stone-200 opacity-75'
                }`}
              >
                <input
                  type="checkbox"
                  checked={statsConfig.showExperts}
                  onChange={() => handleToggleStatsConfig('showExperts')}
                  className="mt-0.5 w-4 h-4 text-emerald-600 rounded cursor-pointer accent-emerald-600"
                />
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-stone-900">公開「專家數」</span>
                    <span className="font-mono text-xs font-black text-purple-700">{adminMetrics.approvedExpertsCount} 位</span>
                  </div>
                  <p className="text-[11px] text-stone-500 leading-snug">
                    展示產學專家與導師人數（每位核發 300 萬點）。
                  </p>
                </div>
              </label>

              {/* 4. 提案數 */}
              <label
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 select-none ${
                  statsConfig.showProposals
                    ? 'bg-emerald-50/50 border-emerald-500 shadow-2xs'
                    : 'bg-stone-50 border-stone-200 opacity-75'
                }`}
              >
                <input
                  type="checkbox"
                  checked={statsConfig.showProposals}
                  onChange={() => handleToggleStatsConfig('showProposals')}
                  className="mt-0.5 w-4 h-4 text-emerald-600 rounded cursor-pointer accent-emerald-600"
                />
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-stone-900">公開「提案數」</span>
                    <span className="font-mono text-xs font-black text-amber-600">{adminMetrics.proposalsCount} 件</span>
                  </div>
                  <p className="text-[11px] text-stone-500 leading-snug">
                    展示各賽道解法與創新提案總件數。
                  </p>
                </div>
              </label>

              {/* 5. 痛點數 */}
              <label
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 select-none ${
                  statsConfig.showPainPoints
                    ? 'bg-emerald-50/50 border-emerald-500 shadow-2xs'
                    : 'bg-stone-50 border-stone-200 opacity-75'
                }`}
              >
                <input
                  type="checkbox"
                  checked={statsConfig.showPainPoints}
                  onChange={() => handleToggleStatsConfig('showPainPoints')}
                  className="mt-0.5 w-4 h-4 text-emerald-600 rounded cursor-pointer accent-emerald-600"
                />
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-stone-900">公開「痛點數」</span>
                    <span className="font-mono text-xs font-black text-rose-600">{adminMetrics.painPointsCount} 題</span>
                  </div>
                  <p className="text-[11px] text-stone-500 leading-snug">
                    展示生活與產業切身痛點徵件數。
                  </p>
                </div>
              </label>

              {/* 6. 已配發點數 */}
              <label
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 select-none ${
                  statsConfig.showAllocatedPoints
                    ? 'bg-emerald-50/50 border-emerald-500 shadow-2xs'
                    : 'bg-stone-50 border-stone-200 opacity-75'
                }`}
              >
                <input
                  type="checkbox"
                  checked={statsConfig.showAllocatedPoints}
                  onChange={() => handleToggleStatsConfig('showAllocatedPoints')}
                  className="mt-0.5 w-4 h-4 text-emerald-600 rounded cursor-pointer accent-emerald-600"
                />
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-stone-900">公開「已配發點數」</span>
                    <span className="font-mono text-xs font-black text-amber-600">${(adminMetrics.totalAllocatedPoints / 10000).toFixed(0)}萬點</span>
                  </div>
                  <p className="text-[11px] text-stone-500 leading-snug">
                    展示各身分帳號與推薦碼產生的點數總額。
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* 💰 點數配發明細與來源拆解 */}
          <div className="p-5 rounded-3xl bg-white border border-stone-200/90 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
              <h4 className="text-sm font-black text-stone-900 flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-500" />
                <span>已配發點數來源明細（各身份帳號與推薦碼累計總額）</span>
              </h4>
              <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                總計：${adminMetrics.totalAllocatedPoints.toLocaleString()} 點
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-purple-50/60 border border-purple-200 space-y-1">
                <span className="text-stone-500 font-bold">1. 專家帳號配發</span>
                <div className="text-base font-black text-purple-700 font-mono">
                  ${adminMetrics.pointsBreakdown.expertsTotalPoints.toLocaleString()} 點
                </div>
                <p className="text-[10px] text-stone-500">
                  {adminMetrics.approvedExpertsCount} 位專家 × 3,000,000 點
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-1">
                <span className="text-stone-500 font-bold">2. 用戶/參賽初始點數</span>
                <div className="text-base font-black text-blue-700 font-mono">
                  ${adminMetrics.pointsBreakdown.participantsTotalPoints.toLocaleString()} 點
                </div>
                <p className="text-[10px] text-stone-500">
                  {adminMetrics.loggedInUsersCount} 位會員 × 100,000 點
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-1">
                <span className="text-stone-500 font-bold">3. 推廣大使推薦碼</span>
                <div className="text-base font-black text-emerald-700 font-mono">
                  ${adminMetrics.pointsBreakdown.referralBonusTotalPoints.toLocaleString()} 點
                </div>
                <p className="text-[10px] text-stone-500">
                  每推薦一案過審 400 點提問金
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-1">
                <span className="text-stone-500 font-bold">4. 痛點採用獎勵</span>
                <div className="text-base font-black text-amber-700 font-mono">
                  ${adminMetrics.pointsBreakdown.painPointAdoptionPoints.toLocaleString()} 點
                </div>
                <p className="text-[10px] text-stone-500">
                  採用提案痛點提出者 1,200 點
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
                <span className="text-stone-500 font-bold">5. 推薦碼分享獎勵</span>
                <div className="text-base font-black text-stone-800 font-mono">
                  ${adminMetrics.pointsBreakdown.shareBonusPoints.toLocaleString()} 點
                </div>
                <p className="text-[10px] text-stone-500">
                  首次分享推薦碼 100 點
                </p>
              </div>
            </div>
          </div>

          {/* ⚡ 痛點過審、推薦碼、痛點採用 全自動發放流水監控中樞 */}
          <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-950 via-stone-900 to-amber-950 text-white border-2 border-emerald-400 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-stone-950 font-black flex items-center justify-center shadow-lg">
                  <Zap className="w-5 h-5 fill-stone-950" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-base font-black tracking-wide text-white">
                      痛點過審 • 推薦碼 • 痛點採用 全自動發放流水系統
                    </h4>
                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500 text-stone-950 animate-pulse flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-stone-950" />
                      <span>三軌全自動發放運作中</span>
                    </span>
                  </div>
                  <p className="text-xs text-stone-300 mt-0.5">
                    系統於管理員點選審核通過或採納發生當下，即時自動化完成金額與點數發放、站內信推播與交易流水記帳。
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={loadAll}
                  className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border border-stone-700"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>即時重整</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
              {/* 軌道 1: 痛點過審 */}
              <div className="p-3.5 rounded-2xl bg-stone-900/90 border border-emerald-500/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>1. 痛點過審自動化</span>
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/40">
                    200 點/案
                  </span>
                </div>
                <p className="text-[11px] text-stone-300 leading-relaxed">
                  會員提出切身痛點通過審核時，系統即時自動發放 <b>200 點</b>提問金（價值 $250，效期 60 日）。
                </p>
                <div className="pt-2 border-t border-stone-800 flex items-center justify-between text-[11px] font-mono text-stone-400">
                  <span>累計發放案件：</span>
                  <span className="font-bold text-emerald-300">{autoRewardStatus.painPointApproval.totalDistributedCases} 案 ({autoRewardStatus.painPointApproval.totalDistributedPoints.toLocaleString()} 點)</span>
                </div>
              </div>

              {/* 軌道 2: 推薦碼 */}
              <div className="p-3.5 rounded-2xl bg-stone-900/90 border border-blue-500/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-cyan-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                    <span>2. 推薦碼引導過審</span>
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 border border-cyan-400/40">
                    300 點/案
                  </span>
                </div>
                <p className="text-[11px] text-stone-300 leading-relaxed">
                  填寫推薦碼之提案審核通過時，系統自動為推廣大使配發 <b>300 點</b>獎勵（價值 $400，效期 60 日）。
                </p>
                <div className="pt-2 border-t border-stone-800 flex items-center justify-between text-[11px] font-mono text-stone-400">
                  <span>累計發放案件：</span>
                  <span className="font-bold text-cyan-300">{autoRewardStatus.referralCode.totalDistributedCases} 案 ({autoRewardStatus.referralCode.totalDistributedPoints.toLocaleString()} 點)</span>
                </div>
              </div>

              {/* 軌道 3: 痛點採用 */}
              <div className="p-3.5 rounded-2xl bg-stone-900/90 border border-amber-500/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-amber-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-amber-400" />
                    <span>3. 痛點採用雙軌撥付</span>
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40">
                    託管撥付+好禮
                  </span>
                </div>
                <p className="text-[11px] text-stone-300 leading-relaxed">
                  日常問答採納自動第三方託管結算拆款撥付；創星季入選提案採用切身痛點時自動撥發 <b>400~1,200 點</b>好禮。
                </p>
                <div className="pt-2 border-t border-stone-800 flex items-center justify-between text-[11px] font-mono text-stone-400">
                  <span>累計採用好禮：</span>
                  <span className="font-bold text-amber-300">{autoRewardStatus.painPointAdoption.totalAdoptedCases} 案 ({autoRewardStatus.painPointAdoption.totalDistributedPoints.toLocaleString()} 點)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 1: 參賽團隊報名審核 (Registrations) */}
      {/* ========================================================================= */}
      {subTab === 'registrations' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-stone-500 px-1">
            <span>共 {filteredRegistrations.length} 筆參賽團隊報名記錄</span>
            <span>可直接在此核准或填寫退回原因</span>
          </div>

          {filteredRegistrations.length === 0 ? (
            <div className="p-12 text-center text-stone-400 bg-white rounded-3xl border border-stone-200">
              <Users className="w-8 h-8 mx-auto mb-2 text-stone-300" />
              <p className="text-xs">尚無符合條件的參賽團隊報名記錄</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredRegistrations.map((reg) => {
                const trackObj = (reg.track && STAR_SEASON_TRACKS[reg.track]) || (reg.track ? Object.values(STAR_SEASON_TRACKS).find((t) => t.id === reg.track) : undefined);
                return (
                  <div
                    key={reg.id}
                    className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 hover:border-emerald-300 transition-all shadow-2xs space-y-3 text-stone-900"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                          {trackObj?.name || '一般賽道'}
                        </span>
                        <h4 className="text-sm font-black text-stone-900">
                          {reg.teamName}
                        </h4>
                        <span className="text-xs text-stone-500">
                          （隊長：{reg.leaderName} • {reg.schoolName} {reg.department}）
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            reg.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : reg.status === 'rejected'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800 animate-pulse'
                          }`}
                        >
                          {reg.status === 'approved'
                            ? '✅ 已核准'
                            : reg.status === 'rejected'
                            ? '❌ 已退回'
                            : '⏳ 待審核'}
                        </span>
                        <span className="text-[10px] text-stone-400 font-mono">
                          {new Date(reg.createdAt).toLocaleDateString('zh-TW')}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-stone-700">
                      <div>
                        <span className="font-bold text-stone-900">專案名稱：</span>
                        <span className="font-bold text-emerald-800">{reg.projectTitle}</span>
                      </div>
                      <p className="text-stone-600 line-clamp-2">
                        <span className="font-bold text-stone-900">專案摘要：</span>
                        {reg.summary}
                      </p>
                      {reg.advisorName && (
                        <div className="text-[11px] text-stone-500">
                          指導教授：{reg.advisorName}
                        </div>
                      )}
                    </div>

                    {/* 審核操作按鍵 */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                      {reg.status !== 'approved' && (
                        <button
                          type="button"
                          onClick={() => handleReviewReg(reg.id, 'approved')}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>核准參賽</span>
                        </button>
                      )}
                      {reg.status !== 'rejected' && (
                        <button
                          type="button"
                          onClick={() =>
                            setActiveReviewNoteModal({
                              id: reg.id,
                              type: 'reg',
                              title: reg.teamName,
                              targetStatus: 'rejected',
                            })
                          }
                          className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>退回修正</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 2: 專家審核 (Experts Management) */}
      {/* ========================================================================= */}
      {subTab === 'experts' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-stone-500 px-1">
            <span>共 {filteredExperts.length} 位專家申請與名單</span>
            <span>核准即配發 3,000,000 創星幣（單案上限 200 萬創星幣）</span>
          </div>

          {filteredExperts.length === 0 ? (
            <div className="p-12 text-center text-stone-400 bg-white rounded-3xl border border-stone-200">
              <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-stone-300" />
              <p className="text-xs">尚無專家申請紀錄</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredExperts.map((exp) => {
                return (
                  <div
                    key={exp.id}
                    className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 hover:border-purple-300 transition-all shadow-2xs space-y-3 text-stone-900"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-300">
                          專家團
                        </span>
                        <h4 className="text-sm font-black text-stone-900">
                          {exp.expertName}
                        </h4>
                        <span className="text-xs text-stone-500">
                          （{exp.organization} • {exp.jobTitle} • 資歷 {exp.yearsOfExperience} 年）
                        </span>
                        {exp.isJudgeSelected && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                            ★ 複賽評審委員
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            exp.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : exp.status === 'rejected'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800 animate-pulse'
                          }`}
                        >
                          {exp.status === 'approved'
                            ? '✅ 已認證（300萬創星幣已配發）'
                            : exp.status === 'rejected'
                            ? '❌ 已退回'
                            : '⏳ 待審核'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs text-stone-700">
                      <p className="text-stone-600 line-clamp-2">
                        <span className="font-bold text-stone-900">專長簡介：</span>
                        {exp.bio}
                      </p>
                      <div className="flex items-center gap-4 text-[11px] text-stone-500 pt-1">
                        <span>Email: {exp.expertEmail}</span>
                        <span>電話: {exp.expertPhone}</span>
                      </div>
                    </div>

                    {/* 審核操作按鍵 */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                      {exp.status === 'approved' ? (
                        <button
                          type="button"
                          onClick={() => handleReviewExpert(exp.id, 'approved', !exp.isJudgeSelected)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                            exp.isJudgeSelected
                              ? 'bg-amber-500 hover:bg-amber-600 text-stone-950 font-black'
                              : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                          }`}
                        >
                          <Award className="w-3.5 h-3.5" />
                          <span>{exp.isJudgeSelected ? '已選為複賽評審（點擊取消）' : '選為複賽評審委員'}</span>
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleReviewExpert(exp.id, 'approved', true)}
                            className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>核准專家並配發 3,000,000 點</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReviewExpert(exp.id, 'rejected', false, '資格未符合')}
                            className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>退回</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 3: 競賽提案審核 (Proposals) */}
      {/* ========================================================================= */}
      {subTab === 'proposals' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-stone-500 px-1">
            <span>共 {filteredProposals.length} 件競賽提案</span>
            <span>通過審核後將正式刊登於探索提案公開庫</span>
          </div>

          {filteredProposals.length === 0 ? (
            <div className="p-12 text-center text-stone-400 bg-white rounded-3xl border border-stone-200">
              <FileText className="w-8 h-8 mx-auto mb-2 text-stone-300" />
              <p className="text-xs">尚無符合條件的提案記錄</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredProposals.map((prop) => {
                const trackObj = STAR_SEASON_TRACKS[prop.track] || Object.values(STAR_SEASON_TRACKS).find((t) => t.id === prop.track);
                return (
                  <div
                    key={prop.id}
                    className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 hover:border-emerald-300 transition-all shadow-2xs space-y-3 text-stone-900"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                          {prop.stage === 'pain_point' ? '徵點子 (痛點)' : '想解方 (提案)'}
                        </span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                          {trackObj?.name || '賽道'}
                        </span>
                        <h4 className="text-sm font-black text-stone-900">
                          {prop.title}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            prop.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : prop.status === 'rejected'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800 animate-pulse'
                          }`}
                        >
                          {prop.status === 'approved'
                            ? '✅ 已刊登'
                            : prop.status === 'rejected'
                            ? '❌ 已退回'
                            : '⏳ 待審核'}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-stone-600 line-clamp-2">
                      {prop.summary}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs">
                      <div className="flex items-center gap-3 text-stone-500 text-[11px]">
                        <span>提案人：{prop.authorName}</span>
                        <span>獲得支持：${(prop.supportPoints || 0).toLocaleString()} 點</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {prop.status !== 'approved' && (
                          <button
                            type="button"
                            onClick={() => handleReviewProp(prop.id, 'approved')}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>核准上架</span>
                          </button>
                        )}
                        {prop.status !== 'rejected' && (
                          <button
                            type="button"
                            onClick={() =>
                              setActiveReviewNoteModal({
                                id: prop.id,
                                type: 'prop',
                                title: prop.title,
                                targetStatus: 'rejected',
                              })
                            }
                            className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>退回</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 4: 決選名次與痛點採用獎勵 (Awards) */}
      {/* ========================================================================= */}
      {subTab === 'awards' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white border border-stone-200 text-xs text-stone-700 space-y-1">
            <h4 className="font-black text-stone-900 text-sm flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>決賽名次核定與痛點獎勵發放</span>
            </h4>
            <p className="text-stone-500">
              冠軍 NT$30,000、亞軍 NT$10,000、季軍 NT$4,000。獲獎團隊所引用的痛點提出者，核可後發放 $1,500 好禮（1200點提問金）。
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {proposals.filter((p) => p.status === 'approved').map((prop) => (
              <div
                key={prop.id}
                className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-stone-900 text-sm">{prop.title}</div>
                  <div className="text-xs text-stone-500">提案人：{prop.authorName}</div>
                </div>

                <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-stone-100 text-xs">
                  <span className="font-bold text-stone-700">核定名次：</span>
                  {[1, 2, 3].map((rank) => (
                    <button
                      key={rank}
                      type="button"
                      onClick={() => handleAward(prop.id, rank, true)}
                      className={`px-3 py-1 rounded-xl font-bold cursor-pointer transition-all ${
                        prop.finalRank === rank
                          ? 'bg-amber-400 text-stone-950 shadow-xs'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      第 {rank} 名 {rank === 1 ? '(3萬)' : rank === 2 ? '(1萬)' : '(4000元)'}
                    </button>
                  ))}
                  {prop.sourcePainPointProposalId && (
                    <span className="ml-auto text-[11px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                      🎁 痛點提出者獎勵：已核可 (1200點提問金)
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 1: 參賽團隊報名審核 (Registrations) */}
      {/* ========================================================================= */}
      {subTab === 'registrations' && (
        <div className="space-y-3">
          {filteredRegistrations.length === 0 ? (
            <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-stone-300 text-stone-400 text-xs">
              目前無符合條件的參賽報名資料
            </div>
          ) : (
            filteredRegistrations.map((reg) => {
              const trackMeta = reg.track ? STAR_SEASON_TRACKS[reg.track] : undefined;
              const isPending = reg.status === 'pending_review';
              const isApproved = reg.status === 'approved';
              const isRejected = reg.status === 'rejected';

              return (
                <div
                  key={reg.id}
                  className={`p-4 rounded-2xl border transition-all space-y-3 bg-white ${
                    isPending
                      ? 'border-amber-300 ring-2 ring-amber-300/30'
                      : isApproved
                      ? 'border-emerald-200 bg-emerald-50/20'
                      : 'border-rose-200 bg-rose-50/20'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-sm text-stone-900 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-emerald-600" />
                        <span>【{reg.teamName}】</span>
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                        {trackMeta?.name || reg.track}
                      </span>
                      <span className="text-xs font-medium text-stone-600">
                        {reg.schoolName} · {reg.department}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${
                          isPending
                            ? 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse'
                            : isApproved
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : 'bg-rose-100 text-rose-900 border-rose-300'
                        }`}
                      >
                        {isPending ? '⏳ 待審核' : isApproved ? '✅ 審核通過' : '❌ 已退回'}
                      </span>
                      <span className="text-[10px] text-stone-400 font-mono">
                        {new Date(reg.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* 提案內容與團隊資訊 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="md:col-span-2 space-y-1.5">
                      <h4 className="font-extrabold text-stone-900 text-sm leading-snug">
                        {reg.projectTitle}
                      </h4>
                      <p className="text-stone-600 leading-relaxed bg-stone-50 p-2.5 rounded-xl border border-stone-200/80">
                        {reg.summary}
                      </p>

                      {/* 採用痛點提示 */}
                      {reg.sourcePainPointTitle && (
                        <div className="text-[11px] text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1 font-medium">
                          <span>💡 採用來源痛點：</span>
                          <span className="font-bold underline">{reg.sourcePainPointTitle}</span>
                        </div>
                      )}

                      {/* 回饋承諾方案 */}
                      <div className="text-[11px] text-stone-700 bg-stone-50 px-2.5 py-1 rounded-lg border border-stone-200">
                        <span className="font-bold text-amber-800">🎁 贊助回饋承諾：</span>
                        <span>{reg.rewardPlanDescription}</span>
                      </div>
                    </div>

                    {/* 團隊成員、附件與募資目標 */}
                    <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-2 text-[11px]">
                      <div>
                        <span className="text-stone-400 block font-bold">隊長與聯絡資訊</span>
                        <span className="font-bold text-stone-900">{reg.leaderName}</span>
                        <div className="text-stone-600 font-mono mt-0.5">
                          {reg.leaderPhone} · {reg.leaderEmail}
                        </div>
                      </div>

                      {reg.teamMembers && reg.teamMembers.length > 0 && (
                        <div>
                          <span className="text-stone-400 block font-bold">團隊成員</span>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {reg.teamMembers.map((m, mi) => (
                              <span key={mi} className="px-1.5 py-0.2 rounded bg-white border border-stone-200 text-stone-700">
                                {m.name} ({m.role || m.department || '隊員'})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="pt-1 border-t border-stone-200 flex items-center justify-between">
                        <span className="text-stone-500 font-bold">模擬募資目標</span>
                        <span className="font-black text-amber-700 font-mono text-xs">
                          NT$ {(reg.targetFundingAmount || 100000).toLocaleString()}
                        </span>
                      </div>

                      {/* BP企劃書或附件 */}
                      <div className="flex items-center gap-1.5 pt-1">
                        {reg.bpDocumentUrl ? (
                          <a
                            href={reg.bpDocumentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold flex items-center gap-1 transition-colors"
                          >
                            <FileText className="w-3 h-3 text-amber-700" />
                            <span>查閱 BP 企劃書</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        ) : (
                          <span className="text-stone-400">未上傳獨立 BP</span>
                        )}

                        {reg.videoUrl && (
                          <a
                            href={reg.videoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-950 font-bold flex items-center gap-1 transition-colors"
                          >
                            <span>宣傳影片</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 審核備註顯示 */}
                  {reg.reviewNote && (
                    <div className="text-[11px] text-stone-600 bg-stone-100 p-2 rounded-xl border border-stone-200 flex items-center gap-2">
                      <span className="font-bold text-stone-800">📝 審核記錄：</span>
                      <span>{reg.reviewNote}</span>
                      {reg.reviewedBy && <span className="text-stone-400">（審核者：{reg.reviewedBy}）</span>}
                    </div>
                  )}

                  {/* 審核操作按鈕列 */}
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-stone-100">
                    <button
                      type="button"
                      onClick={() => handleReviewReg(reg.id, 'approved')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer ${
                        isApproved
                          ? 'bg-emerald-600 text-white cursor-default'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs active:scale-95'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isApproved ? '已核准 (再次核准)' : '核准參賽報名'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveReviewNoteModal({
                          id: reg.id,
                          type: 'reg',
                          title: reg.projectTitle || reg.teamName,
                          targetStatus: 'rejected',
                        });
                        setNoteInput('');
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-black bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>退回修正</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 2: 競賽提案審核 (Proposals) */}
      {/* ========================================================================= */}
      {subTab === 'proposals' && (
        <div className="space-y-3">
          {filteredProposals.length === 0 ? (
            <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-stone-300 text-stone-400 text-xs">
              目前無符合條件的競賽提案
            </div>
          ) : (
            filteredProposals.map((prop) => {
              const trackMeta = STAR_SEASON_TRACKS[prop.track];
              const isPending = prop.status === 'pending_review';
              const isApproved = prop.status === 'approved';

              return (
                <div
                  key={prop.id}
                  className={`p-4 rounded-2xl border transition-all space-y-3 bg-white ${
                    isPending
                      ? 'border-amber-300 ring-2 ring-amber-300/30'
                      : isApproved
                      ? 'border-emerald-200'
                      : 'border-rose-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          prop.stage === 'pain_point'
                            ? 'bg-rose-100 text-rose-900 border border-rose-300'
                            : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}
                      >
                        {prop.stage === 'pain_point' ? '第一階段：徵點子（痛點）' : '第二階段：想解方（提案）'}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                        {trackMeta?.name || prop.track}
                      </span>
                      <span className="text-xs text-stone-500">提案人：{prop.authorName}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${
                          isPending
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : isApproved
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : 'bg-rose-100 text-rose-900 border-rose-300'
                        }`}
                      >
                        {isPending ? '待審核' : isApproved ? '已核准上架' : '退回'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-extrabold text-stone-900 text-sm">{prop.title}</h4>
                    <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                      {prop.summary}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <div className="flex items-center gap-3 text-stone-500 font-mono">
                      <span className="flex items-center gap-1 text-amber-700 font-bold">
                        <Coins className="w-3.5 h-3.5" />
                        <span>{(prop.supportPoints || 0).toLocaleString()} 點支持</span>
                      </span>
                      <span className="flex items-center gap-1 text-rose-600 font-bold">
                        <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                        <span>{prop.likeCount || 0} 讚</span>
                      </span>
                      <span className="flex items-center gap-1 text-stone-600">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{prop.commentsCount || 0} 則討論</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleReviewProp(prop.id, 'approved')}
                        className="px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer shadow-xs active:scale-95"
                      >
                        核准通過
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReviewProp(prop.id, 'rejected')}
                        className="px-3 py-1.5 rounded-xl text-xs font-black bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all cursor-pointer active:scale-95"
                      >
                        退回
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 3: 決選名次與痛點採用獎勵 (Awards) */}
      {/* ========================================================================= */}
      {subTab === 'awards' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-950 space-y-1">
            <span className="font-extrabold block text-amber-900">
              🏆 創星季決選治理規則規範：
            </span>
            <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-amber-900/90 leading-relaxed">
              <li>募資排名前 20 名自動獲得入圍決選資格（僅為入圍資格，非最終得獎）。</li>
              <li>決選由專業評審團進行最終名次評選：冠軍 NT$30,000、亞軍 NT$10,000、季軍 NT$4,000。</li>
              <li>
                獲獎解方若採用第一階段痛點，原痛點提出者將共享「價值 NT$1,500 好禮（1,200 點提問金）」，由管理員人工審核通過後撥付。
              </li>
            </ul>
          </div>

          <div className="space-y-2.5">
            {proposals.map((prop, idx) => {
              const isTop20 = idx < 20;
              const hasAdoptedPainPoint = !!prop.sourcePainPointTitle;

              return (
                <div
                  key={prop.id}
                  className={`p-4 rounded-2xl border bg-white transition-all space-y-2.5 ${
                    prop.finalRank === 1
                      ? 'border-amber-400 ring-2 ring-amber-400/30 bg-amber-50/20'
                      : prop.finalRank === 2
                      ? 'border-stone-400 bg-stone-50/40'
                      : prop.finalRank === 3
                      ? 'border-amber-600 bg-amber-50/10'
                      : 'border-stone-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-stone-900 text-white font-mono font-black text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <h4 className="font-extrabold text-stone-900 text-xs sm:text-sm">
                        {prop.title}
                      </h4>
                      {isTop20 && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-900 border border-cyan-300">
                          入圍決選前20名
                        </span>
                      )}
                      {prop.finalRank && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-stone-950 shadow-2xs">
                          {prop.finalRank === 1 ? '🥇 冠軍 (NT$30,000)' : prop.finalRank === 2 ? '🥈 亞軍 (NT$10,000)' : '🥉 季軍 (NT$4,000)'}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-700">
                      <span>{(prop.supportPoints || 0).toLocaleString()} 點支持</span>
                    </div>
                  </div>

                  {/* 痛點採用獎勵治理 */}
                  {hasAdoptedPainPoint && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="font-black text-emerald-950 flex items-center gap-1">
                          <Gift className="w-3.5 h-3.5 text-emerald-600" />
                          <span>採用來源痛點獎勵（價值 NT$1,500 好禮 / 1,200 點提問金）：</span>
                        </span>
                        <p className="text-[11px] text-stone-700 italic">
                          痛點題目：{prop.sourcePainPointTitle}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                            prop.adoptedSourceApproved
                              ? 'bg-emerald-200 text-emerald-900 border-emerald-400'
                              : 'bg-stone-100 text-stone-600 border-stone-300'
                          }`}
                        >
                          {prop.adoptedSourceApproved ? '已核准撥發 1,200 點' : '待管理員核准'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAward(prop.id, prop.finalRank || 0, !prop.adoptedSourceApproved)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            prop.adoptedSourceApproved
                              ? 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-2xs'
                          }`}
                        >
                          {prop.adoptedSourceApproved ? '取消獎勵' : '核准撥付獎勵'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 管理員評定名次按鈕列 */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-stone-400 text-[11px]">提案人：{prop.authorName}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-stone-500 text-[11px] font-bold">評定獲獎名次：</span>
                      <button
                        type="button"
                        onClick={() => handleAward(prop.id, 1, prop.adoptedSourceApproved || false)}
                        className={`px-2 py-1 rounded-lg font-black text-[11px] transition-colors cursor-pointer ${
                          prop.finalRank === 1
                            ? 'bg-amber-400 text-stone-950 shadow-2xs'
                            : 'bg-stone-100 text-stone-600 hover:bg-amber-100'
                        }`}
                      >
                        冠軍
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAward(prop.id, 2, prop.adoptedSourceApproved || false)}
                        className={`px-2 py-1 rounded-lg font-black text-[11px] transition-colors cursor-pointer ${
                          prop.finalRank === 2
                            ? 'bg-stone-400 text-white shadow-2xs'
                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                      >
                        亞軍
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAward(prop.id, 3, prop.adoptedSourceApproved || false)}
                        className={`px-2 py-1 rounded-lg font-black text-[11px] transition-colors cursor-pointer ${
                          prop.finalRank === 3
                            ? 'bg-amber-700 text-white shadow-2xs'
                            : 'bg-stone-100 text-stone-600 hover:bg-amber-100'
                        }`}
                      >
                        季軍
                      </button>
                      {prop.finalRank && (
                        <button
                          type="button"
                          onClick={() => handleAward(prop.id, 0, prop.adoptedSourceApproved || false)}
                          className="px-1.5 py-1 rounded-lg font-bold text-[10px] text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
                        >
                          清除
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 5: 📁 創星季競賽全套規章與辦法官方存檔資料夾 (僅管理員可見) */}
      {/* ========================================================================= */}
      {subTab === 'rules_archive' && (
        <div className="pt-2 animate-in fade-in duration-200">
          <AdminCompetitionRulesArchiveFolder />
        </div>
      )}

      {/* 退回審核備註 Modal */}
      {activeReviewNoteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 space-y-3 shadow-2xl border border-stone-200 text-stone-900">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
              <span className="font-extrabold text-sm text-stone-900">
                填寫退回修正原因
              </span>
              <button
                type="button"
                onClick={() => setActiveReviewNoteModal(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-stone-500">
              將發送系統審核反饋給團隊負責人，並標注於管理審核紀錄中。
            </p>
            <textarea
              rows={3}
              placeholder="請輸入需要修正的項目（例如：BP企劃書格式未符規範、團隊缺少指導老師簽署等）..."
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-stone-300 text-xs focus:border-rose-500 outline-none"
            />
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setActiveReviewNoteModal(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  if (activeReviewNoteModal.type === 'reg') {
                    handleReviewReg(activeReviewNoteModal.id, 'rejected', noteInput);
                  } else {
                    handleReviewProp(activeReviewNoteModal.id, 'rejected', noteInput);
                  }
                  setActiveReviewNoteModal(null);
                }}
                className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-500 text-white cursor-pointer"
              >
                確認退回
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

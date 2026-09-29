import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { getAiCrmLeadsForSolver, getAiCrmPushesForSolver, getCurrentTimeSlotInfo } from '../services/aiService';
import { AiCrmLead, AiCrmPushNotification } from '../types';
import {
  Crown,
  Sparkles,
  Send,
  CheckCircle2,
  Users,
  Radio,
  BarChart3,
  Clock,
  TrendingUp,
  MessageSquare,
  ShieldCheck,
  Flame,
  Edit3,
  ArrowLeft,
  RefreshCw,
  Sliders,
  ChevronRight,
  Target,
  FileText,
  AlertCircle,
  HelpCircle,
  Zap,
  Activity,
  Layers,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';

interface AiCrmViewProps {
  onBack?: () => void;
  onOpenDirectChat?: (targetUser: { id: string; name: string; avatar: string; title: string }) => void;
}

export const AiCrmView: React.FC<AiCrmViewProps> = ({
  onBack,
  onOpenDirectChat,
}) => {
  const { currentUser, subscribePlan, sendMessage, questions, startDirectChat, aiCrmConfig } = useApp();

  const userTier = currentUser?.subscriptionTier || 'free';
  const isAdmin = currentUser?.role === 'admin';
  const isMaster = userTier === 'master' || isAdmin;

  // AI-CRM 系統先不開放非大師級體驗；僅大師級用戶與管理員具備完整存取權限
  const [demoMode, setDemoMode] = useState<boolean>(isMaster || isAdmin);
  const [activeTab, setActiveTab] = useState<'leads' | 'broadcast' | 'analytics'>('leads');

  // Leads state derived dynamically from questions
  const [leads, setLeads] = useState<AiCrmLead[]>(() =>
    getAiCrmLeadsForSolver(currentUser.domain, currentUser.skills, questions)
  );
  const [pushes] = useState<AiCrmPushNotification[]>(() => getAiCrmPushesForSolver(currentUser.id));
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [editedMessage, setEditedMessage] = useState<string>('');
  const [sendingLeadId, setSendingLeadId] = useState<string | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // 定時自動巡檢與監控狀態
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<string>('剛剛');
  const [selectedStrategyLead, setSelectedStrategyLead] = useState<AiCrmLead | null>(null);
  const [expandedDiagnostics, setExpandedDiagnostics] = useState<Record<string, boolean>>({
    'crm-lead-1': true,
    'crm-lead-2': true,
    'crm-lead-3': true,
  });

  // 當前時段自適應巡航狀態
  const timeSlotInfo = getCurrentTimeSlotInfo(aiCrmConfig);

  useEffect(() => {
    setLeads(getAiCrmLeadsForSolver(currentUser.domain, currentUser.skills, questions));
  }, [currentUser.domain, currentUser.skills, questions]);

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  // 觸發定時巡航主動分析與策略重整
  const handleTriggerPatrolScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setLeads(getAiCrmLeadsForSolver(currentUser.domain, currentUser.skills, questions));
      setIsScanning(false);
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      setLastScanTime(`剛剛 ${timeStr}`);
      showToast('✨ AI-CRM 定時巡航掃描完成！已完成全站用戶狀態深度分析，並為您重新精準制定 3 項獲客策略！');
    }, 1200);
  };

  // Toggle diagnostics section
  const toggleDiagnostics = (leadId: string) => {
    setExpandedDiagnostics((prev) => ({
      ...prev,
      [leadId]: !prev[leadId],
    }));
  };

  // Handle one-click agreement and send message to client
  const handleOneClickSend = async (lead: AiCrmLead) => {
    setSendingLeadId(lead.id);

    try {
      // Dispatch to conversation
      const textToSend = editingLeadId === lead.id ? editedMessage : lead.suggestedMessage;

      // Start direct chat if not exists
      const targetUser = {
        id: lead.clientId,
        name: lead.clientName,
        avatar: lead.clientAvatar,
        title: lead.clientRole,
      };

      const targetQ = questions.find((q) => q.id === lead.questionId);
      const convId = startDirectChat(targetUser, targetQ);

      if (convId) {
        sendMessage(convId, textToSend);
      }

      // Mark lead as sent
      setLeads((prev) =>
        prev.map((item) =>
          item.id === lead.id
            ? { ...item, hasSent: true, sentAt: '剛剛', suggestedMessage: textToSend }
            : item
        )
      );

      setEditingLeadId(null);
      showToast(`已成功向「${lead.clientName}」發送主動跟進訊息與專屬解題策略！`);

      if (onOpenDirectChat) {
        setTimeout(() => {
          onOpenDirectChat(targetUser);
        }, 800);
      }
    } finally {
      setSendingLeadId(null);
    }
  };

  const handleStartEdit = (lead: AiCrmLead) => {
    setEditingLeadId(lead.id);
    setEditedMessage(lead.suggestedMessage);
  };

  const handleSaveEdit = (leadId: string) => {
    if (!editedMessage.trim()) return;
    setLeads((prev) =>
      prev.map((item) =>
        item.id === leadId ? { ...item, suggestedMessage: editedMessage.trim() } : item
      )
    );
    setEditingLeadId(null);
    showToast('AI 建議跟進訊息已成功修改儲存！您可以隨時點擊發送。');
  };

  const handleSaveAndSend = async (lead: AiCrmLead) => {
    if (!editedMessage.trim()) return;
    setLeads((prev) =>
      prev.map((item) =>
        item.id === lead.id ? { ...item, suggestedMessage: editedMessage.trim() } : item
      )
    );
    await handleOneClickSend({ ...lead, suggestedMessage: editedMessage.trim() });
  };

  const handleUpgradeMaster = () => {
    const res = subscribePlan('master', 'monthly');
    if (res.success) {
      setDemoMode(true);
      showToast('恭喜！您已成功升級「大師方案」，AI-CRM 系統已全面解鎖！');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 animate-in fade-in duration-200">
      {/* 管理員預覽專家視角橫幅 (Admin Preview Alert Bar) */}
      {isAdmin && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-purple-900 via-indigo-900 to-stone-900 text-white shadow-md border border-purple-500/40 flex items-center justify-between gap-3 flex-wrap animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/30 text-purple-300 flex items-center justify-center shrink-0 border border-purple-400/40">
              <Crown className="w-4 h-4 text-amber-300 fill-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-amber-300">管理員預覽模式</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500 text-white font-bold">
                  大師方案專家視角
                </span>
              </div>
              <p className="text-[11px] text-purple-200 mt-0.5">
                您正以管理員身分檢視全功能 AI-CRM，可直接模擬測試商機挖掘、跟進話術與推播廣播。
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-bold text-white transition-all cursor-pointer border border-white/20 flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>返回管理面板</span>
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent p-6 sm:p-8 rounded-3xl border border-amber-200/80">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-800 bg-amber-100/90 px-3 py-1 rounded-full border border-amber-300/80 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-700" />
              <span>AI-CRM 主動客戶關係管理系統・大師方案專屬特權</span>
            </span>
          </div>
          <h1 className="text-xl sm:text-3xl font-black text-stone-900 tracking-tight">
            定時主動關注與用戶需求深度分析
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 max-w-2xl leading-relaxed">
            系統演算法定時巡檢全站提問者狀態、痛點需求與猶豫卡點，主動為訂閱大師專家制定專屬作戰策略與破冰方案，主動將潛在商機轉化為高額訂單！
          </p>
        </div>

        {/* Action Header Button */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleTriggerPatrolScan}
            disabled={isScanning}
            className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-black text-xs sm:text-sm shadow-md transition-all cursor-pointer flex items-center gap-2 border border-amber-300 disabled:opacity-50"
            title="立即觸發 AI 深度巡航，更新全站提問者需求與最新策略"
          >
            <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'AI 正在深度巡航掃描中...' : '立即執行 AI 深度巡航分析'}</span>
          </button>
        </div>
      </div>

      {/* 定時主動巡檢監控與健康狀態看板 (Active AI Patrol Status Bar) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-stone-900 via-purple-950/80 to-stone-900 text-white border border-purple-800/40 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600/30 border border-purple-400/40 flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5 text-purple-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-sm sm:text-base text-white">AI-CRM 自動定時巡航引擎</h3>
                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${
                  timeSlotInfo.badgeTheme === 'emerald'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                    : timeSlotInfo.badgeTheme === 'amber'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                    : 'bg-purple-500/20 text-purple-300 border-purple-400/40'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full animate-ping ${
                    timeSlotInfo.badgeTheme === 'emerald'
                      ? 'bg-emerald-400'
                      : timeSlotInfo.badgeTheme === 'amber'
                      ? 'bg-amber-400'
                      : 'bg-purple-400'
                  }`} />
                  <span>{timeSlotInfo.slotName} ({timeSlotInfo.slotRange}) · 每 {timeSlotInfo.currentIntervalHours} 小時動態巡航</span>
                </span>
              </div>
              <div className="flex items-center gap-3 flex-wrap mt-0.5">
                <p className="text-xs text-stone-300">
                  上次巡檢分析：<strong>{lastScanTime}</strong> · 下次自動排程：<strong>{timeSlotInfo.nextScanEstimatedText}</strong>
                </p>
                <span className="text-[11px] text-amber-300/90 font-medium">
                  {timeSlotInfo.focusSummary}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 shrink-0 text-center text-xs">
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-[11px] text-stone-400 block">監控中高意向客情</span>
              <span className="text-sm font-black text-amber-400 font-mono mt-0.5 block">{leads.length} 位客戶</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-[11px] text-stone-400 block">AI 策略預估促成率</span>
              <span className="text-sm font-black text-emerald-400 font-mono mt-0.5 block">85.3%</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 col-span-2 sm:col-span-1">
              <span className="text-[11px] text-stone-400 block">待促成潛在案值</span>
              <span className="text-sm font-black text-purple-300 font-mono mt-0.5 block">NT$ 72,000+</span>
            </div>
          </div>
        </div>
      </div>

      {/* Master Plan Required Gate */}
      {!demoMode ? (
        <div className="p-8 sm:p-12 rounded-3xl bg-white border border-stone-200 shadow-sm text-center space-y-6 max-w-3xl mx-auto">
          <div className="w-16 h-16 rounded-3xl bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center mx-auto shadow-inner">
            <Crown className="w-8 h-8 fill-amber-500 text-amber-600" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-black text-stone-900">
              AI-CRM 客戶關係管理系統僅向「大師方案」專家開放
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 max-w-lg mx-auto leading-relaxed">
              升級大師方案即可解鎖專屬 AI 商業智庫小秘書，享 0% 平台抽成、額外 2% BONUS 撥款補貼與全自動主動客情商機追蹤！
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left max-w-xl mx-auto">
            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-1.5">
              <span className="text-amber-800 font-bold text-xs sm:text-sm flex items-center gap-1.5">
                <Target className="w-4 h-4 text-amber-600" /> 定時商機巡檢
              </span>
              <p className="text-xs text-stone-600 leading-relaxed">
                自動監控曾查看您主頁或提案的提問者，並主動提示最佳切入時間。
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-1.5">
              <span className="text-amber-800 font-bold text-xs sm:text-sm flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" /> 專屬策略制定
              </span>
              <p className="text-xs text-stone-600 leading-relaxed">
                AI 自動根據客戶背景產出客製跟進話術，專家一鍵同意即刻傳送。
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-1.5">
              <span className="text-amber-800 font-bold text-xs sm:text-sm flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-amber-600" /> 系統主動推播
              </span>
              <p className="text-xs text-stone-600 leading-relaxed">
                主動向關注特定主題看板的提問者推播您的專業提案，帶來持續曝光。
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2 flex-wrap justify-center">
            <button
              type="button"
              onClick={handleUpgradeMaster}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-stone-950 font-black text-sm shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              <Crown className="w-4 h-4 fill-stone-950" />
              <span>立即升級大師方案 ($3,990/月，實收 102%)</span>
            </button>
          </div>
        </div>
      ) : (
        /* Full-Page Active Master CRM Dashboard */
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden flex flex-col">
          {/* Nav Tabs */}
          <div className="px-4 sm:px-8 pt-4 border-b border-stone-200 flex items-center gap-2 bg-stone-50/80 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('leads')}
              className={`pb-3.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                activeTab === 'leads'
                  ? 'border-amber-500 text-stone-950'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <Users className="w-4 h-4 text-amber-600" />
              <span>潛在客戶追蹤與跟進雷達</span>
              <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 text-[10px] font-black flex items-center justify-center">
                {leads.filter((l) => !l.hasSent).length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('broadcast')}
              className={`pb-3.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                activeTab === 'broadcast'
                  ? 'border-amber-500 text-stone-950'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <Radio className="w-4 h-4 text-amber-600" />
              <span>系統主動推播擴散</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('analytics')}
              className={`pb-3.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                activeTab === 'analytics'
                  ? 'border-amber-500 text-stone-950'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-amber-600" />
              <span>客戶關係漏斗與成效</span>
            </button>
          </div>

          {/* Tab Content Body */}
          <div className="p-4 sm:p-8 space-y-6">
            {/* TAB 1: LEADS TRACKING */}
            {activeTab === 'leads' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <h3 className="font-extrabold text-base sm:text-lg text-stone-900">
                      即時客情狀態追蹤與專屬策略制定
                    </h3>
                    <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
                      系統定時主動關注與分析用戶狀況和需求，並為您制定最佳促成策略！
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-stone-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
                    待跟進高價值客戶：{leads.filter((l) => !l.hasSent).length} 位
                  </span>
                </div>

                <div className="space-y-5">
                  {leads.map((lead) => {
                    const isExpanded = expandedDiagnostics[lead.id] !== false;

                    return (
                      <div
                        key={lead.id}
                        className={`p-5 sm:p-6 rounded-3xl border transition-all space-y-4 shadow-sm ${
                          lead.hasSent
                            ? 'bg-stone-50/70 border-stone-200 opacity-90'
                            : lead.urgency === 'high'
                            ? 'bg-gradient-to-b from-amber-50/30 to-white border-amber-300 ring-1 ring-amber-200'
                            : 'bg-white border-stone-200'
                        }`}
                      >
                        {/* Client Header Info */}
                        <div className="flex items-start justify-between gap-3 flex-wrap border-b border-stone-100 pb-3.5">
                          <div className="flex items-center gap-3.5">
                            <img
                              src={lead.clientAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                              alt={lead.clientName}
                              className="w-12 h-12 rounded-2xl object-cover border-2 border-amber-200 shadow-xs"
                            />
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-black text-base text-stone-900">{lead.clientName}</h4>
                                <span className="text-xs text-stone-500">{lead.clientRole}</span>
                                <span
                                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                                    lead.urgency === 'high'
                                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {lead.urgency === 'high' ? '🔥 迫切剛需・優先跟進' : '穩健意向'}
                                </span>
                                {lead.clientStatus && (
                                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200">
                                    {lead.clientStatus}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-stone-600 mt-1">
                                <span className="font-semibold text-amber-950">【動態】：{lead.statusDescription}</span>
                                <span className="text-stone-400">•</span>
                                <span className="text-stone-400 flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {lead.lastActiveTime}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {lead.questionTitle && (
                              <div className="text-right text-xs max-w-xs truncate hidden md:block">
                                <span className="text-stone-400 block text-[10px]">關聯專案/懸賞：</span>
                                <span className="font-semibold text-stone-800 truncate block">
                                  {lead.questionTitle}
                                </span>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => toggleDiagnostics(lead.id)}
                              className="p-1.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-500 text-xs font-bold flex items-center gap-1 cursor-pointer"
                              title={isExpanded ? '收合深度診斷與策略' : '展開深度診斷與策略'}
                            >
                              <span className="text-[11px]">{isExpanded ? '收合' : '展開診斷'}</span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        {/* Collapsible Deep Analysis & Strategy Blueprint */}
                        {isExpanded && (
                          <div className="space-y-4 animate-in fade-in duration-150">
                            {/* 1. 用戶狀況與核心需求診斷 (Client Needs Diagnostics) */}
                            {lead.clientNeedsAnalysis && (
                              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/90 text-xs sm:text-sm space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="font-extrabold text-amber-950 flex items-center gap-1.5">
                                    <Sparkles className="w-4 h-4 text-amber-700" />
                                    <span>AI 客戶需求深度診斷與行為分析</span>
                                  </span>
                                  <span className="text-[11px] font-bold text-amber-800 font-mono">
                                    預估預算承載：{lead.clientNeedsAnalysis.budgetIntent}
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                  {/* 痛點 */}
                                  <div className="p-3 bg-white/90 rounded-xl border border-amber-200/70 space-y-1.5">
                                    <span className="font-bold text-stone-900 block flex items-center gap-1">
                                      <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                                      <span>客戶核心痛點拆解：</span>
                                    </span>
                                    <ul className="list-disc list-inside space-y-1 text-stone-700">
                                      {lead.clientNeedsAnalysis.corePainPoints.map((pain, pIdx) => (
                                        <li key={pIdx} className="leading-relaxed">{pain}</li>
                                      ))}
                                    </ul>
                                  </div>

                                  {/* 決策因子與訊號 */}
                                  <div className="p-3 bg-white/90 rounded-xl border border-amber-200/70 space-y-2">
                                    <div>
                                      <span className="font-bold text-stone-900 block flex items-center gap-1 mb-1">
                                        <Target className="w-3.5 h-3.5 text-amber-600" />
                                        <span>關鍵決策因子：</span>
                                      </span>
                                      <div className="flex flex-wrap gap-1.5">
                                        {lead.clientNeedsAnalysis.decisionFactors.map((df, dfIdx) => (
                                          <span key={dfIdx} className="px-2 py-0.5 rounded-md bg-amber-100/70 text-amber-900 text-[10px] font-semibold">
                                            {df}
                                          </span>
                                        ))}
                                      </div>
                                    </div>

                                    <div>
                                      <span className="font-bold text-stone-900 block flex items-center gap-1 mb-1">
                                        <Activity className="w-3.5 h-3.5 text-purple-600" />
                                        <span>定時巡檢互動訊號：</span>
                                      </span>
                                      <ul className="list-disc list-inside space-y-0.5 text-stone-600 text-[11px]">
                                        {lead.clientNeedsAnalysis.interactionSignals.map((sig, sIdx) => (
                                          <li key={sIdx}>{sig}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* 2. AI 專屬作戰策略藍圖 (Strategy Blueprint) */}
                            {lead.strategyBlueprint && (
                              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-950/10 via-indigo-950/5 to-purple-950/10 border border-purple-300 text-xs sm:text-sm space-y-3.5">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <div className="flex items-center gap-2">
                                    <span className="w-7 h-7 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black shadow-xs">
                                      <Layers className="w-4 h-4" />
                                    </span>
                                    <div>
                                      <h5 className="font-black text-sm text-purple-950">
                                        {lead.strategyBlueprint.strategyName}
                                      </h5>
                                      <span className="text-[11px] text-purple-800">
                                        建議方案形式：<strong>{lead.strategyBlueprint.suggestedOfferType}</strong> · 建議報價：<strong>{lead.strategyBlueprint.suggestedPriceRange}</strong>
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <div className="text-right">
                                      <span className="text-[10px] text-stone-500 block font-bold">預估促成率</span>
                                      <span className="text-sm font-black text-emerald-700 font-mono">
                                        {lead.strategyBlueprint.dealProbability}%
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setSelectedStrategyLead(lead)}
                                      className="px-3 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer transition-all active:scale-95"
                                    >
                                      <Sliders className="w-3.5 h-3.5" />
                                      <span>查看策略作戰藍圖</span>
                                    </button>
                                  </div>
                                </div>

                                {/* 3 階段戰術 */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                                  {lead.strategyBlueprint.tacticalSteps.map((step) => (
                                    <div key={step.step} className="p-3 bg-white rounded-xl border border-purple-200/80 space-y-1 shadow-2xs">
                                      <div className="flex items-center gap-1.5">
                                        <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-900 font-mono font-black text-[11px] flex items-center justify-center shrink-0">
                                          {step.step}
                                        </span>
                                        <span className="font-bold text-xs text-stone-900 truncate">{step.title}</span>
                                      </div>
                                      <p className="text-[11px] text-stone-600 leading-relaxed pl-6">{step.desc}</p>
                                    </div>
                                  ))}
                                </div>

                                <div className="flex items-center justify-between text-[11px] text-purple-900/80 bg-purple-50/70 p-2.5 rounded-xl border border-purple-200/70 flex-wrap gap-2">
                                  <span>⏰ 最佳聯繫時機：<strong>{lead.strategyBlueprint.bestContactTime}</strong></span>
                                  <span>🛡️ 避坑防護：{lead.strategyBlueprint.riskAssessment}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* AI Suggested Message & Action Panel */}
                        <div className="p-4 sm:p-5 rounded-2xl bg-stone-50/90 border border-stone-200 space-y-3.5">
                          <div className="flex items-center justify-between gap-3 flex-wrap">
                            <span className="text-xs sm:text-sm font-extrabold text-stone-900 flex items-center gap-1.5">
                              <MessageSquare className="w-4 h-4 text-amber-600" />
                              <span>AI 擬定建議發送之跟進訊息：</span>
                            </span>

                            {/* 頂部快捷操作：直接發送 或 直接編輯 */}
                            {!lead.hasSent && editingLeadId !== lead.id && (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(lead)}
                                  className="px-3 py-1.5 rounded-xl border border-stone-300 hover:border-stone-400 bg-white hover:bg-stone-50 text-stone-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                                  title="編輯建議內容"
                                >
                                  <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                                  <span>編輯</span>
                                </button>

                                <button
                                  type="button"
                                  disabled={sendingLeadId === lead.id}
                                  onClick={() => handleOneClickSend(lead)}
                                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 active:scale-95 text-stone-950 font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                                  title="直接一鍵發送此訊息給客戶"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                  <span>直接發送</span>
                                </button>
                              </div>
                            )}
                          </div>

                          {/* 編輯模式 vs 預覽模式（可直接點擊泡泡編輯） */}
                          {editingLeadId === lead.id ? (
                            <div className="space-y-3 p-3.5 rounded-xl bg-white border-2 border-amber-400 shadow-xs animate-in fade-in duration-150">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-amber-950 flex items-center gap-1.5">
                                  <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                                  <span>編輯專屬溝通訊息：</span>
                                </span>
                                <span className="text-[11px] text-stone-400 font-mono">
                                  {editedMessage.length} 字
                                </span>
                              </div>

                              <textarea
                                rows={3}
                                value={editedMessage}
                                onChange={(e) => setEditedMessage(e.target.value)}
                                className="w-full p-3 rounded-xl border border-amber-300 text-xs sm:text-sm font-normal text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-300 leading-relaxed bg-amber-50/20"
                                placeholder="輸入您想向該提問客戶發送的自訂訊息..."
                              />

                              <div className="flex items-center justify-end gap-2 flex-wrap pt-1">
                                <button
                                  type="button"
                                  onClick={() => setEditingLeadId(null)}
                                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 cursor-pointer transition-colors"
                                >
                                  取消
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleSaveEdit(lead.id)}
                                  className="px-4 py-1.5 rounded-xl text-xs font-bold text-stone-850 bg-stone-200 hover:bg-stone-300 cursor-pointer transition-colors shadow-2xs"
                                >
                                  儲存修改
                                </button>

                                <button
                                  type="button"
                                  disabled={sendingLeadId === lead.id}
                                  onClick={() => handleSaveAndSend(lead)}
                                  className="px-4 py-1.5 rounded-xl text-xs font-black text-stone-950 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 shadow-xs cursor-pointer transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                  <span>儲存並立即發送</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div
                              onClick={() => {
                                if (!lead.hasSent) {
                                  handleStartEdit(lead);
                                }
                              }}
                              className={`p-3.5 sm:p-4 rounded-xl border transition-all relative group ${
                                !lead.hasSent
                                  ? 'bg-white hover:bg-amber-50/40 border-stone-200 hover:border-amber-400 cursor-pointer shadow-2xs'
                                  : 'bg-white border-stone-200 text-stone-800'
                              }`}
                              title={!lead.hasSent ? '點擊此處可直接編輯' : undefined}
                            >
                              <p className="text-xs sm:text-sm text-stone-800 leading-relaxed font-normal">
                                「{lead.suggestedMessage}」
                              </p>

                              {!lead.hasSent && (
                                <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-2.5 top-2.5 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                                  <Edit3 className="w-3 h-3" />
                                  <span>點擊編輯</span>
                                </span>
                              )}
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex items-center justify-between pt-1 gap-3 flex-wrap">
                            <span className="text-xs text-stone-500">
                              💡 建議行動：<strong className="text-stone-700">{lead.aiRecommendedAction}</strong>
                            </span>

                            {lead.hasSent ? (
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                  <span>已於 {lead.sentAt || '剛才'} 主動發送</span>
                                </span>

                                <button
                                  type="button"
                                  onClick={() => {
                                    const targetUser = {
                                      id: lead.clientId,
                                      name: lead.clientName,
                                      avatar: lead.clientAvatar,
                                      title: lead.clientRole,
                                    };
                                    const targetQ = questions.find((q) => q.id === lead.questionId);
                                    startDirectChat(targetUser, targetQ);
                                    if (onOpenDirectChat) {
                                      onOpenDirectChat(targetUser);
                                    }
                                  }}
                                  className="px-3.5 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  <span>進入聊天室對話</span>
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(lead)}
                                  className="px-3 py-2 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>編輯內容</span>
                                </button>

                                <button
                                  type="button"
                                  disabled={sendingLeadId === lead.id}
                                  onClick={() => handleOneClickSend(lead)}
                                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 text-stone-950 font-black text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 active:scale-95"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                  <span>直接點擊發送給客戶</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: SMART PUSH BROADCAST */}
            {activeTab === 'broadcast' && (
              <div className="space-y-6">
                <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200 flex items-start gap-3.5">
                  <Radio className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm sm:text-base text-stone-900">
                      IdeaX 系統主動推播專家聲譽機制
                    </h4>
                    <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                      當您身為大師方案專家，系統演算法會主動在提問者瀏覽相關主題看板或發布相關提問時，主動發送推播通知：「您關注的看板，剛新增了 2 則高品質解題方案」，為您帶來精準曝光與高轉換潛在委託！
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-xs sm:text-sm text-stone-700">近期自動推播紀錄與受眾反饋</h4>
                  {pushes.map((push) => (
                    <div
                      key={push.id}
                      className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 flex items-center justify-between gap-4 shadow-2xs"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-lg border border-amber-200">
                            受眾：{push.targetAudience}
                          </span>
                          <span className="text-[11px] text-stone-400 font-mono">觸發事件：{push.triggerEvent}</span>
                        </div>
                        <p className="text-xs sm:text-sm text-stone-800 font-medium">{push.content}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-stone-400 block font-bold">點擊轉換數</span>
                        <span className="text-base sm:text-lg font-black text-amber-600 font-mono">
                          {push.clicksCount} 次點擊
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Broadcast Automation Setting */}
                <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
                  <h4 className="font-bold text-xs sm:text-sm text-stone-900">推播自動化策略偏好</h4>
                  <div className="space-y-2.5 text-xs sm:text-sm text-stone-700">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" defaultChecked className="rounded text-amber-500 w-4 h-4" />
                      <span>當提問者 3 天未回覆提案時，自動在專家後台生成 AI-CRM 跟進提醒</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" defaultChecked className="rounded text-amber-500 w-4 h-4" />
                      <span>當關注的主題看板有 NT$ 2,000 以上新懸賞時，第一時間推播專家優先提案</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" defaultChecked className="rounded text-amber-500 w-4 h-4" />
                      <span>允許平台向曾查看過個人主頁的提問者，自動推薦最新成功案例精選</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: FUNNEL & ANALYTICS */}
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 text-center shadow-2xs">
                    <span className="text-xs text-stone-400 font-bold block mb-1">本月被檢視提案</span>
                    <span className="text-xl sm:text-2xl font-black text-stone-900 font-mono">48 次</span>
                  </div>
                  <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 text-center shadow-2xs">
                    <span className="text-xs text-stone-400 font-bold block mb-1">CRM 主動跟進數</span>
                    <span className="text-xl sm:text-2xl font-black text-amber-600 font-mono">16 次</span>
                  </div>
                  <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 text-center shadow-2xs">
                    <span className="text-xs text-stone-400 font-bold block mb-1">跟進後促成採納率</span>
                    <span className="text-xl sm:text-2xl font-black text-emerald-600 font-mono">75.0%</span>
                  </div>
                  <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 text-center shadow-2xs">
                    <span className="text-xs text-stone-400 font-bold block mb-1">主動挽回潛在業績</span>
                    <span className="text-xl sm:text-2xl font-black text-stone-900 font-mono">NT$ 38,400</span>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-white border border-stone-200 space-y-4 shadow-2xs">
                  <h4 className="font-bold text-sm sm:text-base text-stone-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span>大摩等級商業轉化漏斗分析</span>
                  </h4>
                  <div className="space-y-3 text-xs sm:text-sm">
                    <div>
                      <div className="flex justify-between font-bold text-stone-700 mb-1.5">
                        <span>1. 客戶檢視專家提案 (48 人)</span>
                        <span>100%</span>
                      </div>
                      <div className="w-full bg-stone-100 rounded-full h-2.5">
                        <div className="bg-amber-400 h-2.5 rounded-full w-full" />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between font-bold text-stone-700 mb-1.5">
                        <span>2. 觸發 AI-CRM 主動跟進 (16 人，3 天猶豫期)</span>
                        <span>33.3%</span>
                      </div>
                      <div className="w-full bg-stone-100 rounded-full h-2.5">
                        <div className="bg-amber-500 h-2.5 rounded-full w-1/3" />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between font-bold text-stone-700 mb-1.5">
                        <span>3. 發送補充資料後重新熱絡諮詢 (14 人)</span>
                        <span>29.1% (跟進有效度 87.5%)</span>
                      </div>
                      <div className="w-full bg-stone-100 rounded-full h-2.5">
                        <div className="bg-emerald-500 h-2.5 rounded-full w-[29%]" />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between font-bold text-stone-700 mb-1.5">
                        <span>4. 最終正式採納與解鎖付款 (12 人)</span>
                        <span>25.0% (促成總成交 NT$ 38,400)</span>
                      </div>
                      <div className="w-full bg-stone-100 rounded-full h-2.5">
                        <div className="bg-emerald-600 h-2.5 rounded-full w-1/4" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Summary & Disclaimer */}
          <div className="p-4 sm:p-5 border-t border-stone-200 bg-stone-50 space-y-3">
            <div className="flex items-center justify-between gap-4 text-xs sm:text-sm text-stone-600 flex-wrap">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>大師方案享有平台 0% 服務費 ＋ 額外 2% BONUS 撥款補貼與全自動 AI-CRM 支持</span>
              </span>
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  返回問題市場
                </button>
              )}
            </div>

            {/* AI-CRM 智能客情與客戶管理策略免責聲明 */}
            <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200/80 text-[11px] text-amber-900 leading-relaxed flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">【AI-CRM 客戶管理與拓客策略免責聲明】</strong>
                本系統提供之定時巡航分析、客戶猶豫期診斷、獲客策略藍圖、報價區間建議及促成率預測，係由 AI 統計模型輔助推算之決策參考工具，不構成商業成果、營收保證或成交承諾。各專案之具體委託條款、方案報價與交付標準，均由解答者與發案雙方自主合意確認。
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 專屬 AI 策略作戰藍圖 Modal */}
      {selectedStrategyLead && selectedStrategyLead.strategyBlueprint && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-stone-200 text-stone-900 my-8">
            <div className="flex items-start justify-between gap-3 border-b border-stone-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <Layers className="w-6 h-6 text-purple-700" />
                </div>
                <div>
                  <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-200">
                    AI-CRM 專屬客戶作戰藍圖
                  </span>
                  <h3 className="text-lg font-black text-stone-900 mt-1">
                    針對「{selectedStrategyLead.clientName}」的促成策略
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStrategyLead(null)}
                className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Strategy Content */}
            <div className="space-y-4 text-xs sm:text-sm">
              <div className="p-4 rounded-2xl bg-purple-50/80 border border-purple-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-purple-950 text-sm">
                    {selectedStrategyLead.strategyBlueprint.strategyName}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold text-xs">
                    預估促成率 {selectedStrategyLead.strategyBlueprint.dealProbability}%
                  </span>
                </div>
                <p className="text-purple-900/80 text-xs">
                  建議方案形式：<strong>{selectedStrategyLead.strategyBlueprint.suggestedOfferType}</strong> · 建議報價區間：<strong>{selectedStrategyLead.strategyBlueprint.suggestedPriceRange}</strong>
                </p>
              </div>

              {/* Steps */}
              <div className="space-y-2.5">
                <span className="font-extrabold text-stone-900 block text-xs flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-purple-600" />
                  <span>三階段作戰落地行動方針：</span>
                </span>
                <div className="space-y-2">
                  {selectedStrategyLead.strategyBlueprint.tacticalSteps.map((step) => (
                    <div key={step.step} className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                          {step.step}
                        </span>
                        <span className="font-bold text-stone-900">{step.title}</span>
                      </div>
                      <p className="text-xs text-stone-600 pl-7 leading-relaxed">{step.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Best Timing & Risk */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                  <span className="font-bold text-stone-800 block mb-1">⏰ 最佳跟進時間：</span>
                  <span className="text-stone-600">{selectedStrategyLead.strategyBlueprint.bestContactTime}</span>
                </div>
                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200">
                  <span className="font-bold text-amber-900 block mb-1">🛡️ 避坑防護重點：</span>
                  <span className="text-amber-800">{selectedStrategyLead.strategyBlueprint.riskAssessment}</span>
                </div>
              </div>

              {/* 彈窗免責聲明 */}
              <div className="p-3 rounded-xl bg-stone-100 text-stone-500 text-[10px] leading-relaxed">
                ℹ️ <strong>免責聲明</strong>：AI 策略藍圖與話術建議僅供溝通參考，不構成商業成果或成交保證，請依實際洽談情境靈活調整。
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setSelectedStrategyLead(null)}
                className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-bold cursor-pointer"
              >
                關閉
              </button>
              <button
                type="button"
                onClick={() => {
                  const leadToAct = selectedStrategyLead;
                  setSelectedStrategyLead(null);
                  handleOneClickSend(leadToAct);
                }}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>套用並發送此策略訊息</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

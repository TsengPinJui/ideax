import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { getAiCrmLeadsForSolver, getAiCrmPushesForSolver } from '../services/aiService';
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
} from 'lucide-react';

interface AiCrmViewProps {
  onBack?: () => void;
  onOpenDirectChat?: (targetUser: { id: string; name: string; avatar: string; title: string }) => void;
}

export const AiCrmView: React.FC<AiCrmViewProps> = ({
  onBack,
  onOpenDirectChat,
}) => {
  const { currentUser, subscribePlan, sendMessage, questions, startDirectChat } = useApp();

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

  useEffect(() => {
    setLeads(getAiCrmLeadsForSolver(currentUser.domain, currentUser.skills, questions));
  }, [currentUser.domain, currentUser.skills, questions]);

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3500);
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

          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0 active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>返回 AI-CRM 管理後台</span>
            </button>
          )}
        </div>
      )}

      {/* Top Breadcrumb & Action Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-stone-200/80">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="px-3 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{isAdmin ? '返回後台控制中心' : '返回'}</span>
            </button>
          )}
          <div className="flex items-center gap-2 text-xs text-stone-500 font-medium">
            <span>首頁</span>
            <ChevronRight className="w-3.5 h-3.5 text-stone-300" />
            <span className="text-stone-900 font-bold">AI-CRM 客戶關係管理</span>
            {isAdmin && <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">（管理員預覽）</span>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLeads(getAiCrmLeadsForSolver(currentUser.domain, currentUser.skills, questions))}
            className="p-1.5 rounded-xl border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 transition-colors cursor-pointer"
            title="重新整理客情數據"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hero Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-stone-950 via-stone-900 to-amber-950 text-white shadow-xl flex items-start justify-between gap-6 flex-wrap relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-amber-500/10 to-transparent pointer-events-none" />
        
        <div className="flex items-start gap-4 relative z-10">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-400 to-amber-500 text-stone-950 flex items-center justify-center font-black shadow-lg shrink-0">
            <Crown className="w-7 h-7 fill-stone-950" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                AI-CRM 客戶關係管理
              </h1>
              <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 text-stone-950 shadow-sm border border-amber-300">
                👑 大師方案 (Master) 專屬特權
              </span>
            </div>
            <p className="text-xs sm:text-sm text-stone-300 leading-relaxed max-w-2xl">
              主動追蹤客戶猶豫狀態・即時深度客情洞察・AI依個別客戶狀況擬定獲客策略，增加客戶黏著度、也增加您的收入！・一鍵同意發送精準解題策略促成交易
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10 shrink-0 self-center sm:self-auto">
          {isMaster ? (
            <div className="px-4 py-2 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>大師特權已全面啟用</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleUpgradeMaster}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-300 text-stone-950 font-black text-xs sm:text-sm shadow-md hover:from-amber-300 hover:to-yellow-200 transition-all cursor-pointer flex items-center gap-2"
            >
              <Crown className="w-4 h-4 fill-stone-950" />
              <span>升級大師方案 ($3,990/月，實收 102%)</span>
            </button>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {feedbackToast && (
        <div className="bg-emerald-600 text-white text-xs sm:text-sm px-4 py-3 rounded-2xl flex items-center justify-between gap-2 font-bold shadow-md animate-in fade-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedbackToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackToast(null)}
            className="text-emerald-100 hover:text-white text-xs cursor-pointer font-normal"
          >
            關閉
          </button>
        </div>
      )}

      {/* Non-Master Upgrade Teaser (If Demo mode is Off) */}
      {!isMaster && !demoMode ? (
        <div className="p-8 sm:p-14 bg-white rounded-3xl border border-stone-200 text-center flex flex-col items-center justify-center space-y-6 shadow-sm">
          <div className="w-20 h-20 rounded-3xl bg-amber-100 text-amber-800 flex items-center justify-center shadow-inner">
            <Crown className="w-10 h-10 fill-amber-500 text-amber-600" />
          </div>

          <div className="max-w-xl space-y-2">
            <h3 className="text-xl sm:text-2xl font-black text-stone-900">
              AI-CRM 客戶關係管理系統僅向「大師方案」專家開放
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              主動客戶關係管理系統為高階接案顧問與專家打造，自動監測提問者閱讀未回覆動態、關注看板新題、推播高命中率話術並支持一鍵同意發送，讓您的商務成交率倍增！
            </p>
          </div>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl text-left">
            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-1.5">
              <span className="text-amber-800 font-bold text-xs sm:text-sm flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-600" /> 即時商機雷達
              </span>
              <p className="text-xs text-stone-600 leading-relaxed">
                追蹤提問者檢視提案天數與主頁收藏次數，精準捕捉 3 天猶豫期。
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-1.5">
              <span className="text-amber-800 font-bold text-xs sm:text-sm flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" /> 一鍵同意發送
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
                      即時客情狀態追蹤與一鍵主動跟進
                    </h3>
                    <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
                      AI依個別客戶狀況擬定獲客策略，增加客戶黏著度、也增加您的收入！
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-stone-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
                    待跟進高價值客戶：{leads.filter((l) => !l.hasSent).length} 位
                  </span>
                </div>

                <div className="space-y-4">
                  {leads.map((lead) => (
                    <div
                      key={lead.id}
                      className={`p-5 sm:p-6 rounded-2xl border transition-all space-y-4 shadow-2xs ${
                        lead.hasSent
                          ? 'bg-stone-50/70 border-stone-200 opacity-90'
                          : lead.urgency === 'high'
                          ? 'bg-amber-50/20 border-amber-300 ring-1 ring-amber-200'
                          : 'bg-white border-stone-200'
                      }`}
                    >
                      {/* Client Header Info */}
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3">
                          <img
                            src={lead.clientAvatar}
                            alt={lead.clientName}
                            className="w-11 h-11 rounded-full object-cover border-2 border-amber-200"
                          />
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-sm sm:text-base text-stone-900">{lead.clientName}</h4>
                              <span className="text-xs text-stone-500">{lead.clientRole}</span>
                              <span
                                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                                  lead.urgency === 'high'
                                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {lead.urgency === 'high' ? '🔥 高意向優先跟進' : '穩定意向'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-stone-600 mt-1">
                              <span className="font-semibold text-amber-950">【狀態】：{lead.statusDescription}</span>
                              <span className="text-stone-400">•</span>
                              <span className="text-stone-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {lead.lastActiveTime}
                              </span>
                            </div>
                          </div>
                        </div>

                        {lead.questionTitle && (
                          <div className="text-right text-xs max-w-xs truncate hidden sm:block">
                            <span className="text-stone-400 block text-[10px]">關聯專案/懸賞：</span>
                            <span className="font-semibold text-stone-800 truncate block">
                              {lead.questionTitle}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* AI Deep Insight Analysis */}
                      <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-xs sm:text-sm space-y-1.5 text-stone-800">
                        <div className="flex items-center gap-1.5 font-bold text-amber-900">
                          <Sparkles className="w-4 h-4 text-amber-600" />
                          <span>AI 深度客情診斷與行為分析：</span>
                        </div>
                        <p className="leading-relaxed text-stone-700 font-normal">{lead.aiInsight}</p>
                      </div>

                      {/* AI Recommended Action & Suggested Message */}
                      <div className="p-4 sm:p-5 rounded-2xl bg-stone-50/80 border border-stone-200/90 space-y-3.5">
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
                  ))}
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

          {/* Footer Summary */}
          <div className="p-4 sm:p-5 border-t border-stone-200 bg-stone-50 flex items-center justify-between gap-4 text-xs sm:text-sm text-stone-600 flex-wrap">
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
        </div>
      )}
    </div>
  );
};

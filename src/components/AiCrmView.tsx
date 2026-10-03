import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { getAiCrmLeadsForSolver, getCurrentTimeSlotInfo } from '../services/aiService';
import { AiCrmLead, AssistantScheduledTask, DEFAULT_ASSISTANT_24HR_CONFIG } from '../types';
import { AiAssistantSettingsPanel } from './AiAssistantSettingsPanel';
import {
  Crown,
  Sparkles,
  Send,
  CheckCircle2,
  BarChart3,
  Clock,
  TrendingUp,
  MessageSquare,
  Edit3,
  ArrowLeft,
  Sliders,
  Target,
  ChevronDown,
  ChevronUp,
  Bot,
  Calendar,
  Play,
  X,
  Plus,
  Trash2,
  Check,
  HelpCircle,
  Coins,
  Flame,
  ShieldCheck,
  Lock,
  ArrowRight,
  Zap,
} from 'lucide-react';

interface AiCrmViewProps {
  onBack?: () => void;
  onOpenDirectChat?: (targetUser: { id: string; name: string; avatar: string; title: string }) => void;
}

export const SCHEDULE_PRESET_OPTIONS = [
  { id: '30m', label: '30 分鐘後', desc: '即刻快速預熱' },
  { id: '1h', label: '1 小時後', desc: '初步沉澱發送' },
  { id: 'today_1530', label: '今日 15:30', desc: '午後思考時段' },
  { id: 'today_1930', label: '今晚 19:30', desc: '晚間決策尖峰' },
  { id: 'today_2100', label: '今晚 21:00', desc: '夜間深度交流' },
  { id: 'tomorrow_0930', label: '明日 09:30', desc: '晨間開工第一案' },
  { id: 'tomorrow_1230', label: '明日 12:30', desc: '午間休息空檔' },
  { id: 'tomorrow_1430', label: '明日 14:30', desc: '午後業務關鍵期' },
  { id: 'tomorrow_2000', label: '明晚 20:00', desc: '次日深度評估' },
  { id: 'after_tomorrow_1000', label: '後天 10:00', desc: '兩天溫和複盤' },
  { id: '3days_1430', label: '3 天後 14:30', desc: '三天猶豫期破冰' },
  { id: 'next_mon_0930', label: '下週一 09:30', desc: '下週開工首選' },
];

export const SCHEDULE_DAYS = ['今天', '明天', '後天', '3天後', '本週末', '下週一'];
export const SCHEDULE_HOURS = ['09:30', '11:00', '12:30', '14:30', '16:30', '19:30', '21:00'];

/**
 * 解析排定時程字串為毫秒時間戳，以利按「由近到遠」精確排序
 */
export function parseScheduleTimestamp(timeStr?: string, fallbackTimestamp?: number): number {
  if (!timeStr) return fallbackTimestamp || Date.now() + 1000 * 60 * 60 * 24;
  const now = Date.now();

  const minMatch = timeStr.match(/(\d+)\s*分鐘後/);
  if (minMatch) {
    return now + parseInt(minMatch[1], 10) * 60 * 1000;
  }

  const hourMatch = timeStr.match(/(\d+)\s*小時後/);
  if (hourMatch) {
    return now + parseInt(hourMatch[1], 10) * 60 * 60 * 1000;
  }

  let dayOffset = 0;
  if (timeStr.includes('今天') || timeStr.includes('今日')) {
    dayOffset = 0;
  } else if (timeStr.includes('明天') || timeStr.includes('明日')) {
    dayOffset = 1;
  } else if (timeStr.includes('後天')) {
    dayOffset = 2;
  } else if (timeStr.includes('3 天後') || timeStr.includes('3天後')) {
    dayOffset = 3;
  } else if (timeStr.includes('本週末')) {
    dayOffset = 4;
  } else if (timeStr.includes('下週一')) {
    dayOffset = 5;
  } else if (timeStr.includes('平日')) {
    dayOffset = 1;
  }

  const timePartMatch = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (timePartMatch) {
    const hours = parseInt(timePartMatch[1], 10);
    const minutes = parseInt(timePartMatch[2], 10);
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + dayOffset);
    targetDate.setHours(hours, minutes, 0, 0);
    if (dayOffset === 0 && targetDate.getTime() < now) {
      targetDate.setDate(targetDate.getDate() + 1);
    }
    return targetDate.getTime();
  }

  return fallbackTimestamp || now + (dayOffset + 1) * 24 * 60 * 60 * 1000;
}

export const AiCrmView: React.FC<AiCrmViewProps> = ({
  onBack,
  onOpenDirectChat,
}) => {
  const {
    currentUser,
    subscribePlan,
    sendMessage,
    questions,
    startDirectChat,
    aiCrmConfig,
    updateAssistant24hrConfig,
  } = useApp();

  const userTier = currentUser?.subscriptionTier || 'free';
  const isAdmin = currentUser?.role === 'admin';
  const isMaster = userTier === 'master' || isAdmin;
  const isAuthority = userTier === 'authority';
  const isAuthorityOrAbove = isMaster || isAuthority || isAdmin;

  // 體驗模式解鎖狀態：預設先用毛玻璃遮蓋，點擊「體驗看看」後才解鎖；離開版面即重置
  const [isDemoUnlocked, setIsDemoUnlocked] = useState(false);

  const [activeTab, setActiveTab] = useState<'leads' | 'bounties' | 'assistant' | 'analytics'>('leads');
  const [assistantSubTab, setAssistantSubTab] = useState<'queue' | 'settings'>('queue');

  // Leads
  const [leads, setLeads] = useState<AiCrmLead[]>(() =>
    getAiCrmLeadsForSolver(currentUser.domain, currentUser.skills, questions)
  );
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [editedMessage, setEditedMessage] = useState<string>('');
  const [sendingLeadId, setSendingLeadId] = useState<string | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Scheduled tasks queue (軍師規劃，24hr特助代操)
  const [scheduledTasks, setScheduledTasks] = useState<AssistantScheduledTask[]>(() => {
    return (
      currentUser.assistant24hrConfig?.scheduledTasks ||
      DEFAULT_ASSISTANT_24HR_CONFIG.scheduledTasks ||
      []
    );
  });

  // 記錄初始乾淨狀態（供體驗模式重置使用，確保離開版面後跳回原本狀態）
  const initialLeadsRef = useRef<AiCrmLead[]>([]);
  const initialTasksRef = useRef<AssistantScheduledTask[]>([]);

  useEffect(() => {
    const rawLeads = getAiCrmLeadsForSolver(currentUser.domain, currentUser.skills, questions);
    initialLeadsRef.current = JSON.parse(JSON.stringify(rawLeads));
    const rawTasks = (
      currentUser.assistant24hrConfig?.scheduledTasks ||
      DEFAULT_ASSISTANT_24HR_CONFIG.scheduledTasks ||
      []
    );
    initialTasksRef.current = JSON.parse(JSON.stringify(rawTasks));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 重置體驗模式：恢復初始狀態，毛玻璃重新遮蓋
  const resetDemoState = () => {
    setIsDemoUnlocked(false);
    if (initialLeadsRef.current && initialLeadsRef.current.length > 0) {
      setLeads(JSON.parse(JSON.stringify(initialLeadsRef.current)));
    } else {
      setLeads(getAiCrmLeadsForSolver(currentUser.domain, currentUser.skills, questions));
    }
    if (initialTasksRef.current && initialTasksRef.current.length > 0) {
      setScheduledTasks(JSON.parse(JSON.stringify(initialTasksRef.current)));
    } else {
      setScheduledTasks(
        JSON.parse(
          JSON.stringify(
            currentUser.assistant24hrConfig?.scheduledTasks ||
              DEFAULT_ASSISTANT_24HR_CONFIG.scheduledTasks ||
              []
          )
        )
      );
    }
    setSchedulingLead(null);
    setEditingLeadId(null);
    setActiveTab('leads');
  };

  // 離開版面自動重置體驗狀態：用戶在體驗模式做的任何動作都不影響實際，一離開這個版面就跳回原本狀態也有重新點擊體驗看看才能再次體驗
  useEffect(() => {
    return () => {
      if (!isAuthorityOrAbove) {
        resetDemoState();
      }
    };
  }, [isAuthorityOrAbove]);

  const handleBack = () => {
    if (!isAuthorityOrAbove) {
      resetDemoState();
    }
    if (onBack) onBack();
  };

  // Modal states for scheduling (純點選式，免手打時段)
  const [schedulingLead, setSchedulingLead] = useState<AiCrmLead | null>(null);
  const [selectedTimeOption, setSelectedTimeOption] = useState<string>('30 分鐘後');
  const [timePickerMode, setTimePickerMode] = useState<'preset' | 'custom_picker'>('preset');
  const [scheduleDay, setScheduleDay] = useState<string>('明天');
  const [scheduleHour, setScheduleHour] = useState<string>('14:30');
  const [scheduleMsg, setScheduleMsg] = useState<string>('');
  const [autoExecute, setAutoExecute] = useState<boolean>(true);

  // Manual create task modal
  const [isManualTaskModalOpen, setIsManualTaskModalOpen] = useState(false);
  const [manualClientName, setManualClientName] = useState('');
  const [manualQuestionTitle, setManualQuestionTitle] = useState('');
  const [manualMsg, setManualMsg] = useState('');
  const [manualTime, setManualTime] = useState('今晚 20:00 (黃金洽談尖峰)');

  // Patrol scan
  const [lastScanTime, setLastScanTime] = useState<string>('剛剛');
  const [expandedDiagnostics, setExpandedDiagnostics] = useState<Record<string, boolean>>({
    'crm-lead-1': true,
  });

  const timeSlotInfo = getCurrentTimeSlotInfo(aiCrmConfig);

  useEffect(() => {
    setLeads(getAiCrmLeadsForSolver(currentUser.domain, currentUser.skills, questions));
  }, [currentUser.domain, currentUser.skills, questions]);

  useEffect(() => {
    if (currentUser.assistant24hrConfig?.scheduledTasks && isAuthorityOrAbove) {
      setScheduledTasks(currentUser.assistant24hrConfig.scheduledTasks);
    }
  }, [currentUser.assistant24hrConfig, isAuthorityOrAbove]);

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  // 軍師拓客巡航與特助開關連線狀態
  const [isRadarActive, setIsRadarActive] = useState(true);
  const [isAssistantActive, setIsAssistantActive] = useState<boolean>(() => {
    return currentUser.assistant24hrConfig?.isEnabled ?? true;
  });

  useEffect(() => {
    if (currentUser.assistant24hrConfig?.isEnabled !== undefined) {
      setIsAssistantActive(currentUser.assistant24hrConfig.isEnabled);
    }
  }, [currentUser.assistant24hrConfig?.isEnabled]);

  const handleToggleRadar = () => {
    const next = !isRadarActive;
    setIsRadarActive(next);
    showToast(next ? '🟢 24hr巡航雷達已啟動' : '⚪ 24hr巡航雷達已暫停');
  };

  const handleToggleAssistant = () => {
    const next = !isAssistantActive;
    setIsAssistantActive(next);
    const currConf = currentUser.assistant24hrConfig || DEFAULT_ASSISTANT_24HR_CONFIG;
    const updated = { ...currConf, isEnabled: next };
    updateAssistant24hrConfig(updated);
    showToast(next ? '🟣 24hr 特助代操已連線啟用' : '⚪ 24hr 特助代操已關閉休眠');
  };

  // 任務同步：體驗模式不影響實際設定，僅正式方案才持久化寫入
  const syncTasks = (tasks: AssistantScheduledTask[]) => {
    setScheduledTasks(tasks);
    if (isAuthorityOrAbove) {
      const currConf = currentUser.assistant24hrConfig || DEFAULT_ASSISTANT_24HR_CONFIG;
      updateAssistant24hrConfig({
        ...currConf,
        scheduledTasks: tasks,
      });
    }
  };

  // Radar view sub-filter (待排定 vs 已轉移軍師佇列)
  const [radarFilter, setRadarFilter] = useState<'pending' | 'transferred' | 'all'>('pending');

  // 檢核某個客戶之策略是否已排定並轉移至軍師佇列
  const isLeadTransferred = (lead: AiCrmLead) => {
    return !!(lead.isScheduled || scheduledTasks.some((t) => t.clientId === lead.clientId && t.status === 'pending'));
  };

  const pendingRadarLeads = leads.filter((l) => !l.hasSent && !isLeadTransferred(l));
  const transferredRadarLeads = leads.filter((l) => isLeadTransferred(l));
  const pendingTaskCount = scheduledTasks.filter((t) => t.status === 'pending').length;

  // 佇列任務：按照時程「由近到遠」嚴格排序 (Nearest upcoming first)
  const sortedScheduledTasks = [...scheduledTasks].sort((a, b) => {
    // 待代操發送 (pending) 排在前面，已完成或取消排在後面
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;
    const timeA = parseScheduleTimestamp(a.scheduledTime, a.scheduledTimestamp);
    const timeB = parseScheduleTimestamp(b.scheduledTime, b.scheduledTimestamp);
    return timeA - timeB;
  });

  const displayedLeads =
    radarFilter === 'pending'
      ? pendingRadarLeads
      : radarFilter === 'transferred'
      ? transferredRadarLeads
      : leads;

  const toggleDiagnostics = (leadId: string) => {
    setExpandedDiagnostics((prev) => ({
      ...prev,
      [leadId]: !prev[leadId],
    }));
  };

  // Direct Send Message
  const handleOneClickSend = async (lead: AiCrmLead, msgOverride?: string) => {
    setSendingLeadId(lead.id);
    try {
      const textToSend = msgOverride || (editingLeadId === lead.id ? editedMessage : lead.suggestedMessage);
      const targetUser = {
        id: lead.clientId,
        name: lead.clientName,
        avatar: lead.clientAvatar,
        title: lead.clientRole,
      };

      // 僅在正式方案下才發送至真實對話，體驗模式下不影響實際
      if (isAuthorityOrAbove) {
        const targetQ = questions.find((q) => q.id === lead.questionId);
        const convId = startDirectChat(targetUser, targetQ);
        if (convId) {
          sendMessage(convId, textToSend);
        }
      }

      setLeads((prev) =>
        prev.map((item) =>
          item.id === lead.id
            ? { ...item, hasSent: true, sentAt: '剛剛', suggestedMessage: textToSend }
            : item
        )
      );

      setEditingLeadId(null);
      showToast(
        isAuthorityOrAbove
          ? `已向「${lead.clientName}」發送跟進訊息！`
          : `🚀【體驗模式】已模擬發送跟進訊息（不影響實際對話）！`
      );

      if (onOpenDirectChat && isAuthorityOrAbove) {
        setTimeout(() => {
          onOpenDirectChat(targetUser);
        }, 600);
      }
    } finally {
      setSendingLeadId(null);
    }
  };

  // Open Schedule Dialog for Lead (排定的時間默認為 aicrm 判斷的針對此用戶的最適時間)
  const handleOpenScheduleModal = (lead: AiCrmLead) => {
    setSchedulingLead(lead);
    setScheduleMsg(lead.suggestedMessage);
    const optimalTime =
      lead.strategyBlueprint?.bestContactTime ||
      (lead.urgency === 'high'
        ? '今日 14:00 - 18:00 (高意向搶佔首位優勢)'
        : lead.urgency === 'medium'
        ? '今晚 19:30 - 21:00 (晚間決策尖峰窗口)'
        : '明日 09:30 - 11:30 (晨間業務空檔)');
    setSelectedTimeOption(optimalTime);
    setAutoExecute(true);
  };

  // Confirm Scheduling Task (軍師擬定 -> 已經排定的策略轉移到右邊佇列，並且都按照近到遠排序)
  const handleConfirmSchedule = () => {
    if (!schedulingLead) return;
    const timeToUse = selectedTimeOption;
    const calculatedTimestamp = parseScheduleTimestamp(timeToUse);
    const taskId = `task-${Date.now()}`;

    const newTask: AssistantScheduledTask = {
      id: taskId,
      clientId: schedulingLead.clientId,
      clientName: schedulingLead.clientName,
      clientAvatar: schedulingLead.clientAvatar,
      questionId: schedulingLead.questionId,
      questionTitle: schedulingLead.questionTitle,
      strategySource: `AI-CRM 軍師策略：${schedulingLead.aiRecommendedAction}`,
      suggestedAction: '24hr 特助代操：發送專屬解題策略與時程建議',
      messageTemplate: scheduleMsg.trim() || schedulingLead.suggestedMessage,
      scheduledTime: timeToUse,
      scheduledTimestamp: calculatedTimestamp,
      status: 'pending',
      autoExecute,
      createdAt: '剛剛',
    };

    // 標註客戶策略已排定並轉移
    setLeads((prev) =>
      prev.map((l) =>
        l.id === schedulingLead.id
          ? {
              ...l,
              isScheduled: true,
              scheduledTaskId: taskId,
              scheduledTime: timeToUse,
            }
          : l
      )
    );

    const nextTasks = [newTask, ...scheduledTasks.filter((t) => t.id !== newTask.id)];
    syncTasks(nextTasks);
    setSchedulingLead(null);

    // 核心流轉：已經排定的策略轉移到右邊佇列，並依時程由近到遠排序
    showToast(
      isAuthorityOrAbove
        ? `🤖「${schedulingLead.clientName}」策略已轉移至右側 24hr 特助佇列！已依時程由近到遠排序。`
        : `🤖【體驗模式】「${schedulingLead.clientName}」策略已轉移至 24hr 特助佇列！`
    );
  };

  // Execute Scheduled Task right now by Assistant
  const handleExecuteScheduledTask = (task: AssistantScheduledTask) => {
    const targetUser = {
      id: task.clientId,
      name: task.clientName,
      avatar: task.clientAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      title: '發案客戶',
    };

    // 僅在正式方案下才發送真實訊息，體驗模式下不影響實際
    if (isAuthorityOrAbove) {
      const targetQ = task.questionId ? questions.find((q) => q.id === task.questionId) : undefined;
      const convId = startDirectChat(targetUser, targetQ);
      if (convId) {
        const assistantMessage = `[24hr AI特助代發] ${task.messageTemplate}`;
        sendMessage(convId, assistantMessage);
      }
    }

    const updatedTasks = scheduledTasks.map((t) =>
      t.id === task.id
        ? {
            ...t,
            status: 'completed' as const,
            executedAt: '剛剛',
            executionResult: isAuthorityOrAbove
              ? '特助已代操發送成功，客戶聊天室已即時送達！'
              : '【體驗模式】特助代操發送成功（不影響真實資料）！',
          }
        : t
    );

    syncTasks(updatedTasks);
    showToast(
      isAuthorityOrAbove
        ? `⚡ 24hr 特助已成功代操發送至「${task.clientName}」的聊天室！`
        : `⚡【體驗模式】24hr 特助模擬代操發送完成！`
    );
  };

  // Cancel Scheduled Task
  const handleCancelScheduledTask = (taskId: string) => {
    const updated = scheduledTasks.map((t) =>
      t.id === taskId ? { ...t, status: 'cancelled' as const } : t
    );
    syncTasks(updated);
    showToast('已取消此特助排程代操任務。');
  };

  // Delete Task
  const handleDeleteTask = (taskId: string) => {
    const updated = scheduledTasks.filter((t) => t.id !== taskId);
    syncTasks(updated);
    showToast('已刪除此排程任務。');
  };

  // Manual Task Submit
  const handleCreateManualTask = () => {
    if (!manualClientName.trim() || !manualMsg.trim()) return;
    const newTask: AssistantScheduledTask = {
      id: `task-${Date.now()}`,
      clientId: `client-${Date.now()}`,
      clientName: manualClientName.trim(),
      questionTitle: manualQuestionTitle.trim() || '專案合作洽談',
      strategySource: '專家手動委託 AI 特助代操排程',
      suggestedAction: '24hr 特助代操發送',
      messageTemplate: manualMsg.trim(),
      scheduledTime: manualTime,
      scheduledTimestamp: Date.now() + 1000 * 60 * 60,
      status: 'pending',
      autoExecute: true,
      createdAt: '剛剛',
    };

    syncTasks([newTask, ...scheduledTasks]);
    setIsManualTaskModalOpen(false);
    setManualClientName('');
    setManualQuestionTitle('');
    setManualMsg('');
    showToast(`🤖 特助代操任務已新增！將於「${manualTime}」發送。`);
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
    showToast('已更新跟進話術！');
  };

  const handleUpgradeMaster = () => {
    const res = subscribePlan('master', 'monthly');
    if (res.success) {
      showToast('已升級大師方案！AI-CRM 與 24hr AI特助代操全面啟用。');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 animate-in fade-in duration-200">
      {/* Toast */}
      {feedbackToast && (
        <div className="fixed top-16 right-4 sm:right-8 z-50 px-4 py-2.5 rounded-2xl bg-stone-900 text-white text-xs sm:text-sm font-bold shadow-xl border border-stone-700 flex items-center gap-2 animate-in slide-in-from-top-2 duration-150">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Admin Preview Alert Bar */}
      {isAdmin && (
        <div className="p-3 sm:p-3.5 rounded-2xl bg-stone-900 text-white shadow-sm border border-purple-500/40 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0 border border-purple-400/30">
              <Crown className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-black text-amber-300 mr-2">管理員視角</span>
              <span className="text-[11px] text-stone-300">
                AI-CRM 軍師策略與 24hr 特助代操全功能預覽中
              </span>
            </div>
          </div>
          {onBack && (
            <button
              type="button"
              onClick={handleBack}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-bold text-white transition-all cursor-pointer border border-white/20 flex items-center gap-1.5 shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>返回面板</span>
            </button>
          )}
        </div>
      )}

      {/* Executive Hero Banner (電腦寬版/手機緊湊) */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-900 to-amber-950 p-4 sm:p-6 rounded-3xl text-white shadow-sm border border-stone-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-amber-300 bg-amber-950/80 border border-amber-600/40 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span className="sm:hidden">24hr巡航雷達 × 特助代操</span>
                <span className="hidden sm:inline">24hr巡航雷達 × 24hr 特助代操</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold border border-purple-400/30">
                24hr 離線全天巡航 (自動化代操)
              </span>
              {onBack && !isAdmin && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-2.5 py-0.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-[11px] font-bold text-stone-300 hover:text-white transition-all cursor-pointer flex items-center gap-1 border border-white/15"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>返回</span>
                </button>
              )}
            </div>
            <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight">
              客戶關係管理與自動化代操
            </h1>
            <p className="text-xs text-stone-300 max-w-xl leading-relaxed">
              AI-CRM 智能分析客情意向與切入時機，24hr 特助全天候自動化發送與接待守護。
            </p>
          </div>

          {/* 雷達與特助連線狀態 ＋ 開關控制區 (整合面板) */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-white/5 border border-white/10 shrink-0 backdrop-blur-xs space-y-2.5 min-w-[260px] sm:min-w-[280px]">
            {/* 24hr巡航雷達狀態 ＋ 開關 */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full shrink-0 ${isRadarActive ? 'bg-emerald-400 animate-pulse' : 'bg-stone-500'}`} />
                <div>
                  <span className="text-xs font-bold text-stone-200 block">
                    <span className="sm:hidden">巡航雷達</span>
                    <span className="hidden sm:inline">24hr巡航雷達</span>
                  </span>
                  <span className={`text-[10px] font-medium block ${isRadarActive ? 'text-emerald-400' : 'text-stone-400'}`}>
                    {isRadarActive ? '正常・即時全天巡航' : '已暫停巡航'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleRadar}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                  isRadarActive ? 'bg-emerald-500' : 'bg-stone-700'
                }`}
                title={isRadarActive ? '點擊暫停 24hr巡航雷達' : '點擊啟用 24hr巡航雷達'}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white shadow-md transition-transform absolute top-1 ${
                    isRadarActive ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>

            <div className="h-px bg-white/10" />

            {/* 特助連線狀態 ＋ 開關 */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full shrink-0 ${isAssistantActive ? 'bg-emerald-400 animate-pulse' : 'bg-stone-500'}`} />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-stone-200">特助連線狀態</span>
                    {/* ? 說明提示 */}
                    <div className="relative inline-block group">
                      <button
                        type="button"
                        className="w-3.5 h-3.5 rounded-full bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white flex items-center justify-center text-[9px] font-bold cursor-pointer"
                        title="特助功能說明"
                        aria-label="特助功能說明"
                      >
                        ?
                      </button>
                      <div className="hidden group-hover:block absolute right-0 sm:left-0 sm:right-auto top-5 z-50 w-72 sm:w-80 p-3 rounded-2xl bg-stone-900/95 text-stone-200 text-xs leading-relaxed border border-stone-700 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-start gap-2">
                          <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <p className="text-xs text-stone-200 leading-relaxed font-medium">
                            協助專家離線時主動與客戶交談維持客戶關係，自動梳理時程與痛點規格；並依排程時段自主代發破冰提案，確保潛在訂單零流失！
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <span className={`text-[10px] font-medium block ${isAssistantActive ? 'text-emerald-400' : 'text-stone-400'}`}>
                    {isAssistantActive ? '正常・24hr 自動代操' : '已關閉休眠'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleAssistant}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                  isAssistantActive ? 'bg-amber-500' : 'bg-stone-700'
                }`}
                title={isAssistantActive ? '點擊關閉特助代操' : '點擊啟用特助代操'}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white shadow-md transition-transform absolute top-1 ${
                    isAssistantActive ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-stone-400">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1.5 text-stone-300">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>當前時段：{timeSlotInfo.slotName} ({timeSlotInfo.slotRange})</span>
            </span>
            <span className="text-stone-600">•</span>
            <span>最後巡檢：{lastScanTime}</span>
          </div>
        </div>
      </div>

      {/* Non-subscribed User Feature Sample Showcase Banner */}
      {!isAuthorityOrAbove && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-sky-50 via-amber-50/40 to-transparent border-2 border-sky-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-800 border border-sky-300 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black text-sky-950 bg-sky-100 border border-sky-300 px-2 py-0.5 rounded-md">
                  【AI-CRM × 24hr 特助代操】
                </span>
                <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-sky-100 text-sky-900 border border-sky-300">
                  實機體驗模式
                </span>
              </div>
              <p className="text-[11px] text-stone-600 mt-1">
                可自由操作體驗，操作不影響實際資料。
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto flex-wrap">
            {!isDemoUnlocked ? (
              <button
                type="button"
                onClick={() => {
                  setIsDemoUnlocked(true);
                  const el = document.getElementById('ai-crm-demo-dashboard');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 active:scale-95 text-white font-black text-xs shadow-md shadow-sky-500/25 transition-all cursor-pointer flex items-center gap-1.5 border border-sky-300"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>體驗看看</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  resetDemoState();
                }}
                title="再次點擊取消體驗狀態"
                className="px-4 py-2 rounded-xl bg-sky-50 border-2 border-sky-400 text-sky-700 hover:bg-sky-100 active:scale-95 font-black text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-sky-600 animate-pulse" />
                <span>體驗中</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleUpgradeMaster}
              className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-stone-950 font-black text-xs transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <Crown className="w-3.5 h-3.5 fill-stone-950" />
              <span>馬上開通！</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Active Dashboard (全體用戶皆可查閱實機範例與完整內涵，體驗區域用水藍色外匡框住) */}
      <div
        id="ai-crm-demo-dashboard"
        className={`bg-white rounded-3xl transition-all flex flex-col relative overflow-hidden ${
          !isAuthorityOrAbove
            ? 'border-2 border-sky-400 ring-4 ring-sky-200/50 shadow-xl shadow-sky-100/50'
            : 'border border-stone-200 shadow-2xs'
        }`}
      >
        {/* 未解鎖體驗模式時的清透毛玻璃遮蓋層 (清晰透視底層實機畫面，點擊「體驗看看」立即解鎖) */}
        {!isAuthorityOrAbove && !isDemoUnlocked && (
          <div className="absolute inset-0 z-30 backdrop-blur-[0.75px] bg-stone-900/10 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
            <div className="bg-white/95 backdrop-blur-md border-2 border-sky-400 rounded-3xl p-5 sm:p-7 max-w-md w-full text-center shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
              <div className="space-y-1">
                <h3 className="text-lg sm:text-xl font-black text-stone-900 tracking-tight">
                  體驗 AI-CRM 24hr巡航雷達 & 特助代操
                </h3>
                <p className="text-xs text-stone-600">
                  意向診斷、時段智能排定、24hr 自動代操發送
                </p>
              </div>

              {/* 體驗說明框 */}
              <div className="p-3 sm:p-3.5 rounded-2xl bg-sky-50/80 border border-sky-200 text-left space-y-1">
                <p className="text-xs text-sky-950 font-bold">
                  點擊解鎖實機體驗：
                </p>
                <p className="text-[11px] text-sky-900 leading-relaxed">
                  排程與代操發送為模擬示範，不影響真實資料，離開本頁自動復原。
                </p>
              </div>

              {/* 按鈕組：水藍色體驗看看按鍵 */}
              <div className="space-y-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsDemoUnlocked(true);
                  }}
                  className="w-full py-3 px-5 rounded-2xl bg-sky-500 hover:bg-sky-400 active:scale-98 text-white font-black text-sm shadow-md shadow-sky-500/25 border border-sky-300 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>體驗看看</span>
                </button>

                <button
                  type="button"
                  onClick={handleUpgradeMaster}
                  className="w-full py-2.5 px-4 rounded-2xl bg-amber-400 hover:bg-amber-300 active:scale-98 text-stone-950 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs"
                >
                  <Crown className="w-3.5 h-3.5 fill-stone-950" />
                  <span>馬上開通！</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Top Segmented Navigation Tabs */}
        <div className="px-3 sm:px-6 pt-3 border-b border-stone-200 flex items-center gap-1.5 bg-stone-50/70 overflow-x-auto text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('leads')}
              className={`pb-3 px-3.5 border-b-2 transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                activeTab === 'leads'
                  ? 'border-amber-500 text-stone-900 font-black'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <Target className="w-4 h-4 text-amber-600" />
              <span className="sm:hidden">巡航雷達</span>
              <span className="hidden sm:inline">24hr巡航雷達</span>
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-stone-950 text-[10px] font-black">
                {leads.filter((l) => !l.hasSent).length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('bounties')}
              className={`pb-3 px-3.5 border-b-2 transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                activeTab === 'bounties'
                  ? 'border-amber-500 text-stone-900 font-black'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span className="sm:hidden">優質提案</span>
              <span className="hidden sm:inline">優質提案推薦您來賺</span>
              <span className="px-1.5 py-0.2 rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 text-stone-950 text-[10px] font-black shadow-2xs">
                {isAuthorityOrAbove ? '高賞' : '權威專屬'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('assistant')}
              className={`pb-3 px-3.5 border-b-2 transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                activeTab === 'assistant'
                  ? 'border-amber-500 text-stone-900 font-black'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <Bot className="w-4 h-4 text-amber-600" />
              <span className="sm:hidden">特助代操</span>
              <span className="hidden sm:inline">24hr 特助代操</span>
              {pendingTaskCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-white text-[10px] font-black">
                  {pendingTaskCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('analytics')}
              className={`pb-3 px-3.5 border-b-2 transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                activeTab === 'analytics'
                  ? 'border-amber-500 text-stone-900 font-black'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-amber-600" />
              <span>轉化漏斗</span>
            </button>
          </div>

          {/* TAB 1: 24hr巡航雷達 */}
          {activeTab === 'leads' && (
            <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-stone-900">
                    <span className="sm:hidden">24hr巡航雷達・客情診斷</span>
                    <span className="hidden sm:inline">24hr巡航雷達・客情診斷</span>
                  </h3>
                  <p className="text-[11px] sm:text-xs text-stone-500">
                    全天候巡航發案客戶痛點與猶豫期，一鍵委託特助排程代操或親自發送。
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                    待跟進：{leads.filter((l) => !l.hasSent).length} 位
                  </span>
                </div>
              </div>

              {/* Leads List */}
              <div className="space-y-3.5">
                {leads.map((lead) => {
                  const isExpanded = expandedDiagnostics[lead.id] !== false;
                  const relatedTask = scheduledTasks.find(
                    (t) => t.clientId === lead.clientId && t.status === 'pending'
                  );

                  return (
                    <div
                      key={lead.id}
                      className={`p-3.5 sm:p-5 rounded-2xl border transition-all space-y-3 shadow-2xs ${
                        lead.hasSent
                          ? 'bg-stone-50/60 border-stone-200'
                          : lead.urgency === 'high'
                          ? 'bg-amber-50/20 border-amber-300 ring-1 ring-amber-200/60'
                          : 'bg-white border-stone-200'
                      }`}
                    >
                      {/* Client Header */}
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={
                              lead.clientAvatar ||
                              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                            }
                            alt={lead.clientName}
                            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl object-cover border border-amber-200 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-black text-sm text-stone-900">{lead.clientName}</h4>
                              <span className="text-[11px] text-stone-500">{lead.clientRole}</span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.2 rounded-md ${
                                  lead.urgency === 'high'
                                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {lead.urgency === 'high' ? '🔥 優先跟進' : '穩健意向'}
                              </span>
                              {relatedTask && (
                                <span className="text-[10px] font-bold px-2 py-0.2 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5" />
                                  <span>軍師已排定：{relatedTask.scheduledTime}</span>
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-stone-500 mt-0.5 flex-wrap">
                              <span className="font-semibold text-stone-700">動態：{lead.statusDescription}</span>
                              <span>•</span>
                              <span>{lead.lastActiveTime}</span>
                            </div>
                          </div>
                        </div>

                        {/* Right: Question snippet & toggle */}
                        <div className="flex items-center gap-2 shrink-0">
                          {lead.questionTitle && (
                            <span className="text-[11px] text-stone-500 hidden md:inline max-w-xs truncate">
                              專案：{lead.questionTitle}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => toggleDiagnostics(lead.id)}
                            className="p-1 px-2 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-600 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <span>{isExpanded ? '收合' : '客情診斷'}</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>

                      {/* Expandable Strategist Blueprint */}
                      {isExpanded && lead.clientNeedsAnalysis && (
                        <div className="p-3 sm:p-4 rounded-xl bg-amber-50/50 border border-amber-200/80 space-y-2.5 text-xs animate-in fade-in duration-150">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-amber-950 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                              <span>客情診斷報告</span>
                            </span>
                            <span className="text-[11px] font-mono text-amber-800">
                              預算評估：{lead.clientNeedsAnalysis.budgetIntent}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                            <div className="p-2.5 bg-white rounded-lg border border-amber-200/60 space-y-1">
                              <span className="font-bold text-stone-800 block">核心痛點：</span>
                              <ul className="list-disc list-inside space-y-0.5 text-stone-600">
                                {lead.clientNeedsAnalysis.corePainPoints.map((pain, pIdx) => (
                                  <li key={pIdx}>{pain}</li>
                                ))}
                              </ul>
                            </div>
                            <div className="p-2.5 bg-white rounded-lg border border-amber-200/60 space-y-1">
                              <span className="font-bold text-stone-800 block">決策關鍵因子：</span>
                              <div className="flex flex-wrap gap-1">
                                {lead.clientNeedsAnalysis.decisionFactors.map((df, dfIdx) => (
                                  <span key={dfIdx} className="px-1.5 py-0.2 rounded bg-amber-100/70 text-amber-900 text-[10px]">
                                    {df}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* AI Suggested Message Area */}
                      <div className="p-3 sm:p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-stone-800 flex items-center gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                            <span>推薦話術</span>
                          </span>
                          {!lead.hasSent && editingLeadId !== lead.id && (
                            <button
                              type="button"
                              onClick={() => handleStartEdit(lead)}
                              className="text-[11px] font-bold text-stone-600 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>修改話術</span>
                            </button>
                          )}
                        </div>

                        {editingLeadId === lead.id ? (
                          <div className="space-y-2">
                            <textarea
                              rows={3}
                              value={editedMessage}
                              onChange={(e) => setEditedMessage(e.target.value)}
                              className="w-full p-2.5 rounded-lg border border-amber-300 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-400 bg-white leading-relaxed"
                              placeholder="編輯跟進話術..."
                            />
                            <div className="flex justify-end gap-2 text-xs">
                              <button
                                type="button"
                                onClick={() => setEditingLeadId(null)}
                                className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold"
                              >
                                取消
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(lead.id)}
                                className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold"
                              >
                                儲存
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-stone-700 leading-relaxed font-normal bg-white p-2.5 rounded-lg border border-stone-200">
                            「{lead.suggestedMessage}」
                          </p>
                        )}

                        {/* Actions (電腦水平排列 / 手機自適應) */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-1 gap-2.5">
                          <span className="text-[11px] text-stone-500">
                            💡 建議行動：<strong className="text-stone-700">{lead.aiRecommendedAction}</strong>
                          </span>

                          {lead.hasSent ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold self-start sm:self-auto">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>已發送跟進</span>
                            </span>
                          ) : (
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* 核心新功能：排定發送 */}
                              <button
                                type="button"
                                onClick={() => handleOpenScheduleModal(lead)}
                                className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-300 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95"
                                title="由 AI-CRM 作為軍師排定時程，24hr 特助作為代操者全自動發送"
                              >
                                <Bot className="w-3.5 h-3.5 text-purple-700" />
                                <span>排定發送</span>
                              </button>

                              {/* 立即親自發送 */}
                              <button
                                type="button"
                                disabled={sendingLeadId === lead.id}
                                onClick={() => handleOneClickSend(lead)}
                                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 text-stone-950 font-black text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs disabled:opacity-50 active:scale-95"
                              >
                                <Send className="w-3 h-3" />
                                <span>親自發送</span>
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

          {/* TAB 2: 💰 優質提案推薦您來賺 (權威方案以上專屬) */}
          {activeTab === 'bounties' && (
            <div className="p-3.5 sm:p-6 space-y-5 animate-in fade-in duration-200">
              {/* Header Banner */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-yellow-400/10 to-transparent border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-400 text-stone-950 flex items-center justify-center shrink-0 shadow-2xs">
                    <Sparkles className="w-5 h-5 fill-stone-950" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-black text-sm sm:text-base text-stone-900">
                        💰 優質提案推薦您來賺
                      </h3>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-200 text-stone-950 border border-amber-300">
                        權威方案 95% 實收 • 大師方案 98% 實收
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-stone-600 mt-0.5">
                      AI-CRM 演算法全天候巡弋全站題庫，主動過濾高賞高回報難題，為您估算實收淨利與破局方針。
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-mono font-black px-3 py-1.5 rounded-xl bg-white border border-amber-200 text-amber-950 shadow-2xs">
                    精選高賞池：{questions.filter((q) => q.bounty >= 500 && q.status === 'open').length} 題
                  </span>
                </div>
              </div>

              {/* 非權威方案以上時的解鎖推廣卡 */}
              {!isAuthorityOrAbove ? (
                <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-stone-900 to-stone-950 text-white border border-amber-500/30 text-center space-y-5 shadow-xl">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-400 text-stone-950 flex items-center justify-center mx-auto shadow-md">
                    <Lock className="w-6 h-6 stroke-[2.5]" />
                  </div>

                  <div className="space-y-1.5 max-w-lg mx-auto">
                    <span className="text-[11px] font-bold text-amber-400 tracking-wider uppercase">
                      AUTHORITY & MASTER EXCLUSIVE
                    </span>
                    <h4 className="text-lg sm:text-2xl font-black text-white tracking-tight">
                      升級權威方案，解鎖「優質提案推薦您來賺」
                    </h4>
                    <p className="text-xs text-stone-300 leading-relaxed">
                      AI-CRM Agent 將依照您的專業認證領域，智能過濾 S 級高額懸賞（NT$ 1,000 ~ 50,000+）並自動分析客戶心理抗拒與提案切入點，搭配超低 5% ~ 2% 平台服務費，讓您每案實收高達 95% ~ 98%！
                    </p>
                  </div>

                  {/* 核心優勢亮點 */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto text-left text-xs">
                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                      <span className="font-bold text-amber-300 flex items-center gap-1.5">
                        <Coins className="w-4 h-4" /> 實收 95% ~ 98%
                      </span>
                      <p className="text-[11px] text-stone-400">大師方案服務費僅 2%、權威方案僅 5%，收益全額直落您的帳戶。</p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                      <span className="font-bold text-amber-300 flex items-center gap-1.5">
                        <Flame className="w-4 h-4" /> 高賞好題優先推播
                      </span>
                      <p className="text-[11px] text-stone-400">第一時間捕捉高賞、急件發案方，搶先私聊破冰贏得委託。</p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                      <span className="font-bold text-amber-300 flex items-center gap-1.5">
                        <Zap className="w-4 h-4" /> AI 破局提案切入點
                      </span>
                      <p className="text-[11px] text-stone-400">自動拆解發案者深層驗收標準，生成高勝率 3 階段報價策略。</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => subscribePlan('authority', 'monthly')}
                      className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs shadow-md active:scale-95 transition-all cursor-pointer"
                    >
                      👑 升級權威方案（服務費 5% • NT$ 599/月）
                    </button>
                    <button
                      type="button"
                      onClick={() => subscribePlan('master', 'monthly')}
                      className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-stone-950 font-black text-xs shadow-md active:scale-95 transition-all cursor-pointer"
                    >
                      ⭐ 升級頂級大師方案（服務費 2% • NT$ 1,980/月）
                    </button>
                  </div>
                </div>
              ) : (
                /* 已解鎖狀態：展示高額懸賞好題列表與獲利試算 */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {questions
                      .filter((q) => q.bounty >= 500 && q.status === 'open')
                      .sort((a, b) => b.bounty - a.bounty)
                      .map((q) => {
                        const payoutRate = isMaster ? 0.98 : 0.95;
                        const feePercent = isMaster ? '2%' : '5%';
                        const estimatedPayout = Math.round(q.bounty * payoutRate);
                        const savedFee = Math.round(q.bounty * (0.25 - (1 - payoutRate)));
                        const isHighTier = q.bounty >= 5000;

                        return (
                          <div
                            key={q.id}
                            className="p-4 sm:p-5 rounded-2xl border border-stone-200 bg-white hover:border-amber-400 hover:shadow-md transition-all flex flex-col justify-between space-y-3.5 group"
                          >
                            <div className="space-y-2.5">
                              {/* Top Bar: Bounty & Tier Badge */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                    isHighTier
                                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-stone-950 shadow-2xs'
                                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                                  }`}>
                                    {isHighTier ? '💎 S級高賞好題' : '🔥 熱門高單商機'}
                                  </span>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-600">
                                    {q.category}
                                  </span>
                                </div>

                                <span className="text-[10px] font-bold text-stone-400">
                                  難度 {q.level}
                                </span>
                              </div>

                              {/* Title */}
                              <h4 className="font-black text-sm text-stone-900 group-hover:text-amber-700 transition-colors line-clamp-2 leading-snug">
                                {q.title}
                              </h4>

                              {/* Profit Earnings Card */}
                              <div className="p-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 flex items-center justify-between">
                                <div>
                                  <span className="text-[10px] text-stone-500 block">懸賞總額</span>
                                  <span className="text-xs font-bold text-stone-700 font-mono">
                                    NT$ {q.bounty.toLocaleString()}
                                  </span>
                                </div>

                                <div className="text-right">
                                  <span className="text-[10px] font-bold text-amber-900 block flex items-center gap-1 justify-end">
                                    <Sparkles className="w-3 h-3 text-amber-600" />
                                    <span>預估實收入帳（抽成僅 {feePercent}）</span>
                                  </span>
                                  <span className="text-base font-black text-amber-600 font-mono">
                                    NT$ {estimatedPayout.toLocaleString()}
                                  </span>
                                </div>
                              </div>

                              {/* AI-CRM Strategy Insight */}
                              <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-100 text-[11px] text-stone-600 space-y-1">
                                <span className="font-bold text-stone-800 flex items-center gap-1">
                                  <Target className="w-3.5 h-3.5 text-amber-600" />
                                  <span>AI-CRM 破局切入建議：</span>
                                </span>
                                <p className="leading-relaxed line-clamp-2">
                                  發案客戶尋求明確驗收標準與可落地方案。建議於第一段直接梳理關鍵痛點指標，第二段附上里程碑交付進度，提高搶案勝率！
                                </p>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
                              <span className="text-[10px] text-stone-400">
                                發案方：{q.authorName}
                              </span>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    startDirectChat({
                                      id: q.authorId,
                                      name: q.authorName,
                                      avatar: q.authorAvatar,
                                      title: '發案提問方',
                                    });
                                    if (onOpenDirectChat) {
                                      onOpenDirectChat({
                                        id: q.authorId,
                                        name: q.authorName,
                                        avatar: q.authorAvatar,
                                        title: '發案提問方',
                                      });
                                    }
                                  }}
                                  className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-amber-100 text-stone-800 hover:text-amber-950 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                                  <span>私聊破冰</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: 24hr 特助代操 */}
          {activeTab === 'assistant' && (
            <div className="p-3.5 sm:p-6 space-y-5">
              {/* Architecture Banner: AI-CRM策略 × 24hr特助代操 */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-purple-900/10 via-amber-500/10 to-transparent border border-purple-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 border border-purple-300 flex items-center justify-center shrink-0">
                    <Bot className="w-5 h-5 text-purple-700" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-black text-xs sm:text-sm text-stone-900">
                        AI-CRM 策略規劃 ➔ 24hr 特助自動代操
                      </h4>
                      <div className="relative inline-block group">
                        <button
                          type="button"
                          className="w-4 h-4 rounded-full bg-purple-100 hover:bg-purple-200 text-purple-800 border border-purple-300 flex items-center justify-center text-[10px] font-black cursor-pointer transition-all"
                          title="說明"
                          aria-label="功能說明"
                        >
                          ?
                        </button>
                        <div className="hidden group-hover:block absolute left-0 top-6 z-50 w-72 sm:w-80 p-3 rounded-2xl bg-stone-900/95 text-stone-200 text-xs leading-relaxed border border-stone-700 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
                          <div className="flex items-start gap-2">
                            <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            <p className="text-xs text-stone-200 leading-relaxed font-medium">
                              協助專家離線時主動與客戶交談維持客戶關係，自動梳理時程與痛點規格；並依排程時段自主代發破冰提案，確保潛在訂單零流失！
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      軍師分析最佳切入時機，24hr 特助全天候代發訊息與接待守護。
                    </p>
                  </div>
                </div>

                {/* Sub Tab Switch */}
                <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200 shrink-0 text-xs">
                  <button
                    type="button"
                    onClick={() => setAssistantSubTab('queue')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      assistantSubTab === 'queue'
                        ? 'bg-white text-stone-900 shadow-2xs'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5 text-purple-600" />
                    <span>代操排程佇列 ({pendingTaskCount})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAssistantSubTab('settings')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      assistantSubTab === 'settings'
                        ? 'bg-white text-stone-900 shadow-2xs'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5 text-amber-600" />
                    <span>特助設定</span>
                  </button>
                </div>
              </div>

              {/* Sub-View A: 排定代操佇列 */}
              {assistantSubTab === 'queue' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <h4 className="font-extrabold text-xs sm:text-sm text-stone-900">
                        代操任務佇列
                      </h4>
                      <p className="text-[11px] text-stone-500">
                        預定時程抵達時，特助全自動進入聊天室代發。
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsManualTaskModalOpen(true)}
                      className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>新增代操任務</span>
                    </button>
                  </div>

                  {scheduledTasks.length === 0 ? (
                    <div className="p-8 text-center bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                      <Bot className="w-8 h-8 text-stone-400 mx-auto" />
                      <p className="text-xs font-bold text-stone-700">目前尚無排定代操任務</p>
                      <p className="text-[11px] text-stone-500">
                        前往「24hr巡航雷達」點選「排定發送」，系統將自動建立排程。
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {scheduledTasks.map((task) => (
                        <div
                          key={task.id}
                          className={`p-3.5 sm:p-4 rounded-2xl border transition-all space-y-2.5 shadow-2xs ${
                            task.status === 'completed'
                              ? 'bg-stone-50/70 border-stone-200'
                              : task.status === 'cancelled'
                              ? 'bg-stone-50/50 border-stone-200 opacity-60'
                              : 'bg-white border-purple-200 ring-1 ring-purple-100'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                                  task.status === 'completed'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : task.status === 'cancelled'
                                    ? 'bg-stone-200 text-stone-600'
                                    : 'bg-purple-100 text-purple-900'
                                }`}
                              >
                                <Bot className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-black text-xs sm:text-sm text-stone-900">
                                    {task.clientName}
                                  </span>
                                  {task.questionTitle && (
                                    <span className="text-[11px] text-stone-500">
                                      ({task.questionTitle})
                                    </span>
                                  )}
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.2 rounded-md ${
                                      task.status === 'completed'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : task.status === 'cancelled'
                                        ? 'bg-stone-200 text-stone-600'
                                        : 'bg-purple-100 text-purple-900 border border-purple-300'
                                    }`}
                                  >
                                    {task.status === 'completed'
                                      ? '✅ 已代發'
                                      : task.status === 'cancelled'
                                      ? '已取消'
                                      : '⏳ 待代發'}
                                  </span>
                                </div>
                                <span className="text-[11px] text-purple-900 font-semibold block mt-0.5">
                                  {task.strategySource}
                                </span>
                              </div>
                            </div>

                            {/* Scheduled Time info */}
                            <div className="flex items-center gap-1.5 text-xs text-stone-600 font-mono">
                              <Calendar className="w-3.5 h-3.5 text-purple-600" />
                              <span>預定時程：{task.scheduledTime}</span>
                            </div>
                          </div>

                          {/* Message Content */}
                          <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-700 leading-relaxed font-normal">
                            「{task.messageTemplate}」
                          </div>

                          {/* Action footer */}
                          <div className="flex items-center justify-between pt-1 gap-2 flex-wrap text-xs">
                            <span className="text-[11px] text-stone-500">
                              {task.status === 'completed' && task.executionResult ? (
                                <span className="text-emerald-700 font-bold">{task.executionResult}</span>
                              ) : (
                                <span>模式：全自動代操</span>
                              )}
                            </span>

                            <div className="flex items-center gap-2">
                              {task.status === 'pending' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleExecuteScheduledTask(task)}
                                    className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer shadow-2xs active:scale-95"
                                    title="立即由 24hr 特助代操發送"
                                  >
                                    <Play className="w-3 h-3 fill-white" />
                                    <span>立即代操</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleCancelScheduledTask(task.id)}
                                    className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs cursor-pointer"
                                  >
                                    取消
                                  </button>
                                </>
                              )}

                              <button
                                type="button"
                                onClick={() => handleDeleteTask(task.id)}
                                className="p-1 rounded-lg hover:bg-rose-50 text-stone-400 hover:text-rose-600 cursor-pointer"
                                title="刪除任務"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Sub-View B: 特助設定與防護 */}
              {assistantSubTab === 'settings' && (
                <div className="space-y-4">
                  <AiAssistantSettingsPanel
                    currentUser={currentUser}
                    onUpdateConfig={(newConfig) => {
                      updateAssistant24hrConfig(newConfig);
                      showToast('✨ 24hr 特助設定已儲存！');
                    }}
                    onUpgradePlan={handleUpgradeMaster}
                  />
                </div>
              )}
            </div>
          )}

          {/* TAB 3: 轉化漏斗 */}
          {activeTab === 'analytics' && (
            <div className="p-3.5 sm:p-6 space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 sm:p-4 rounded-2xl bg-stone-50 border border-stone-200 text-center">
                  <span className="text-[11px] text-stone-400 font-bold block mb-1">提案檢視數</span>
                  <span className="text-lg sm:text-xl font-black text-stone-900 font-mono">48 次</span>
                </div>
                <div className="p-3.5 sm:p-4 rounded-2xl bg-stone-50 border border-stone-200 text-center">
                  <span className="text-[11px] text-stone-400 font-bold block mb-1">特助代操跟進</span>
                  <span className="text-lg sm:text-xl font-black text-amber-600 font-mono">16 次</span>
                </div>
                <div className="p-3.5 sm:p-4 rounded-2xl bg-stone-50 border border-stone-200 text-center">
                  <span className="text-[11px] text-stone-400 font-bold block mb-1">促成採納率</span>
                  <span className="text-lg sm:text-xl font-black text-emerald-600 font-mono">75.0%</span>
                </div>
                <div className="p-3.5 sm:p-4 rounded-2xl bg-stone-50 border border-stone-200 text-center">
                  <span className="text-[11px] text-stone-400 font-bold block mb-1">促成業績</span>
                  <span className="text-lg sm:text-xl font-black text-stone-900 font-mono">NT$ 38,400</span>
                </div>
              </div>

              {/* Conversion Funnel Bar */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 space-y-3 shadow-2xs">
                <h4 className="font-bold text-xs sm:text-sm text-stone-900 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>客戶轉化階段</span>
                </h4>
                <div className="space-y-2.5 text-xs">
                  <div>
                    <div className="flex justify-between font-bold text-stone-700 mb-1">
                      <span>1. 客戶檢視專家提案 (48 人)</span>
                      <span>100%</span>
                    </div>
                    <div className="w-full bg-stone-100 rounded-full h-2">
                      <div className="bg-amber-400 h-2 rounded-full w-full" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between font-bold text-stone-700 mb-1">
                      <span>2. AI-CRM 軍師策略規劃與猶豫期破冰 (24 人)</span>
                      <span>50.0%</span>
                    </div>
                    <div className="w-full bg-stone-100 rounded-full h-2">
                      <div className="bg-purple-500 h-2 rounded-full w-1/2" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between font-bold text-stone-700 mb-1">
                      <span>3. 24hr 特助代操排程發送 (16 人)</span>
                      <span>33.3%</span>
                    </div>
                    <div className="w-full bg-stone-100 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full w-1/3" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between font-bold text-stone-700 mb-1">
                      <span>4. 成功採納與履約撥款 (12 人)</span>
                      <span>25.0%</span>
                    </div>
                    <div className="w-full bg-stone-100 rounded-full h-2">
                      <div className="bg-emerald-500 h-2 rounded-full w-1/4" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Disclaimer */}
          <div className="p-3.5 sm:p-4 border-t border-stone-200 bg-stone-50/70 text-[11px] text-stone-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span>
              創點子 IdeaX • AI-CRM 客戶關係管理
            </span>
            {onBack && (
              <button
                type="button"
                onClick={handleBack}
                className="text-stone-700 hover:text-stone-900 font-bold cursor-pointer underline self-start sm:self-auto"
              >
                返回
              </button>
            )}
          </div>
        </div>

      {/* Schedule Modal (策略擬定 -> 特助代操) */}
      {schedulingLead && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-4 sm:p-6 space-y-4 shadow-2xl border border-stone-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-purple-700" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-stone-900">
                    排定特助代操發送
                  </h3>
                  <p className="text-[10px] text-stone-500">
                    策略擬定 ➔ 24hr 特助自動代發
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSchedulingLead(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Target Client & Strategy Card */}
              {(() => {
                const optimalTime =
                  schedulingLead.strategyBlueprint?.bestContactTime ||
                  (schedulingLead.urgency === 'high'
                    ? '今日 14:00 - 18:00 (高意向搶佔首位優勢)'
                    : schedulingLead.urgency === 'medium'
                    ? '今晚 19:30 - 21:00 (晚間決策尖峰窗口)'
                    : '明日 09:30 - 11:30 (晨間業務空檔)');

                return (
                  <>
                    <div className="p-3 rounded-2xl bg-purple-50/80 border border-purple-200 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-xs text-purple-950">目標客戶：{schedulingLead.clientName}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-200 text-purple-900 font-bold">
                          {schedulingLead.strategyBlueprint?.strategyName || '客情破冰策略'}
                        </span>
                      </div>
                      <p className="text-[11px] text-purple-800">
                        建議行動：{schedulingLead.aiRecommendedAction}
                      </p>
                      <div className="pt-1.5 border-t border-purple-200/80 flex items-center justify-between flex-wrap gap-1 text-[11px]">
                        <span className="text-purple-900 font-bold flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          <span>推薦時段：</span>
                        </span>
                        <span className="font-black text-purple-950 bg-white/80 px-2 py-0.5 rounded-md border border-purple-200">
                          {optimalTime}
                        </span>
                      </div>
                    </div>

                    {/* Time Selection (純選項選擇，完全免打字) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-stone-700 block">
                          排定發送時間：
                        </label>
                        <span className="text-[10px] text-purple-700 font-bold flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          <span>AICRM 推薦時段</span>
                        </span>
                      </div>

                      {/* 預設首選：AICRM 針對此用戶判斷之最適時間 */}
                      <button
                        type="button"
                        onClick={() => setSelectedTimeOption(optimalTime)}
                        className={`w-full p-2.5 rounded-xl text-left transition-all border cursor-pointer flex items-center justify-between ${
                          selectedTimeOption === optimalTime
                            ? 'bg-gradient-to-r from-purple-900 to-indigo-950 text-white border-purple-900 shadow-sm ring-2 ring-purple-300'
                            : 'bg-purple-50/50 hover:bg-purple-100/60 text-purple-950 border-purple-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                              selectedTimeOption === optimalTime
                                ? 'bg-amber-400 text-stone-950 font-bold'
                                : 'bg-purple-200 text-purple-800'
                            }`}
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-black text-xs">{optimalTime}</span>
                              <span
                                className={`text-[9px] px-1.5 py-0.2 rounded font-black ${
                                  selectedTimeOption === optimalTime
                                    ? 'bg-amber-400 text-stone-950'
                                    : 'bg-purple-200 text-purple-900'
                                }`}
                              >
                                精選推薦
                              </span>
                            </div>
                            <span
                              className={`text-[10px] block ${
                                selectedTimeOption === optimalTime
                                  ? 'text-purple-200'
                                  : 'text-stone-500'
                              }`}
                            >
                              依客戶作息與決策窗口精算
                            </span>
                          </div>
                        </div>
                        {selectedTimeOption === optimalTime && (
                          <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                        )}
                      </button>

                      {/* 其他時段點選面板（免打字，提供豐富選項） */}
                      <div className="pt-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-stone-600">時段自選：</span>
                          <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-lg border border-stone-200 text-[10px]">
                            <button
                              type="button"
                              onClick={() => setTimePickerMode('preset')}
                              className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                                timePickerMode === 'preset'
                                  ? 'bg-purple-900 text-white shadow-2xs'
                                  : 'text-stone-600 hover:text-stone-900'
                              }`}
                            >
                              常用時段
                            </button>
                            <button
                              type="button"
                              onClick={() => setTimePickerMode('custom_picker')}
                              className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                                timePickerMode === 'custom_picker'
                                  ? 'bg-purple-900 text-white shadow-2xs'
                                  : 'text-stone-600 hover:text-stone-900'
                              }`}
                            >
                              自訂日期時刻
                            </button>
                          </div>
                        </div>

                        {timePickerMode === 'preset' ? (
                          /* Mode 1: 常用精選時段 (12 個情境點選卡片) */
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-[160px] overflow-y-auto pr-0.5">
                            {SCHEDULE_PRESET_OPTIONS.map((opt) => {
                              const isSelected = selectedTimeOption === opt.label;
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() => setSelectedTimeOption(opt.label)}
                                  className={`p-2 rounded-xl text-left transition-all border cursor-pointer ${
                                    isSelected
                                      ? 'bg-purple-900 text-white border-purple-900 shadow-2xs'
                                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                                  }`}
                                >
                                  <div className="font-bold text-xs leading-tight">{opt.label}</div>
                                  <div className={`text-[9px] mt-0.5 ${isSelected ? 'text-purple-200' : 'text-stone-400'}`}>
                                    {opt.desc}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          /* Mode 2: 日期 + 時段兩鍵點選組合盤 (100% 點選，不需鍵盤輸入) */
                          <div className="p-2.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                            <div>
                              <div className="text-[10px] font-bold text-stone-500 mb-1">① 點選發送日期：</div>
                              <div className="grid grid-cols-6 gap-1">
                                {SCHEDULE_DAYS.map((day) => (
                                  <button
                                    key={day}
                                    type="button"
                                    onClick={() => {
                                      setScheduleDay(day);
                                      setSelectedTimeOption(`${day} ${scheduleHour}`);
                                    }}
                                    className={`py-1.5 px-1 rounded-lg text-center font-bold text-[11px] transition-all cursor-pointer border ${
                                      scheduleDay === day
                                        ? 'bg-purple-900 text-white border-purple-900 shadow-2xs'
                                        : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                                    }`}
                                  >
                                    {day}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div>
                              <div className="text-[10px] font-bold text-stone-500 mb-1">② 點選發送時刻：</div>
                              <div className="grid grid-cols-4 sm:grid-cols-7 gap-1">
                                {SCHEDULE_HOURS.map((hr) => (
                                  <button
                                    key={hr}
                                    type="button"
                                    onClick={() => {
                                      setScheduleHour(hr);
                                      setSelectedTimeOption(`${scheduleDay} ${hr}`);
                                    }}
                                    className={`py-1 px-1 rounded-lg text-center font-mono font-bold text-[11px] transition-all cursor-pointer border ${
                                      scheduleHour === hr
                                        ? 'bg-purple-900 text-white border-purple-900 shadow-2xs'
                                        : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                                    }`}
                                  >
                                    {hr}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="pt-1.5 border-t border-stone-200/80 flex items-center justify-between text-xs">
                              <span className="text-[10px] text-stone-500 font-bold">點選組合結果：</span>
                              <span className="font-black text-purple-900 bg-purple-100 px-2 py-0.5 rounded-md border border-purple-200">
                                {selectedTimeOption}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                );
              })()}

              {/* Message to send */}
              <div className="space-y-1.5">
                <label className="font-bold text-stone-700 block">
                  代發訊息話術：
                </label>
                <textarea
                  rows={3}
                  value={scheduleMsg}
                  onChange={(e) => setScheduleMsg(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-purple-500 leading-relaxed"
                />
              </div>

              {/* Mode Toggle */}
              <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-stone-800 block">全自動代操</span>
                  <span className="text-[10px] text-stone-500">
                    時程抵達時自動進入聊天室代發
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={autoExecute}
                  onChange={(e) => setAutoExecute(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setSchedulingLead(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmSchedule}
                className="px-4 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>確認排定</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Task Modal */}
      {isManualTaskModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-4 sm:p-6 space-y-4 shadow-2xl border border-stone-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-black text-sm text-stone-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-purple-600" />
                <span>新增代操任務</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsManualTaskModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-stone-700">目標客戶名稱：</label>
                <input
                  type="text"
                  value={manualClientName}
                  onChange={(e) => setManualClientName(e.target.value)}
                  placeholder="例如：張總經理 (前瞻生技)"
                  className="w-full p-2 rounded-xl border border-stone-300 text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700">專案/主題 (選填)：</label>
                <input
                  type="text"
                  value={manualQuestionTitle}
                  onChange={(e) => setManualQuestionTitle(e.target.value)}
                  placeholder="例如：生醫檢測規格諮詢"
                  className="w-full p-2 rounded-xl border border-stone-300 text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-stone-700 block">排定時間：</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {[
                    '30 分鐘後',
                    '今晚 19:30',
                    '今晚 21:00',
                    '明日 09:30',
                    '明日 14:30',
                    '後天 10:00',
                  ].map((timeOpt) => (
                    <button
                      key={timeOpt}
                      type="button"
                      onClick={() => setManualTime(timeOpt)}
                      className={`p-1.5 rounded-xl text-center font-bold text-xs transition-all border cursor-pointer ${
                        manualTime === timeOpt
                          ? 'bg-purple-900 text-white border-purple-900 shadow-2xs'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {timeOpt}
                    </button>
                  ))}
                </div>
                <div className="text-[11px] font-bold text-purple-900 bg-purple-50 p-2 rounded-xl border border-purple-200 flex items-center justify-between">
                  <span>已選擇發送時間：</span>
                  <span className="font-black text-xs text-purple-950">{manualTime}</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700">代操訊息內容：</label>
                <textarea
                  rows={3}
                  value={manualMsg}
                  onChange={(e) => setManualMsg(e.target.value)}
                  placeholder="輸入軍師代發訊息..."
                  className="w-full p-2.5 rounded-xl border border-stone-300 text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-purple-500 leading-relaxed"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setIsManualTaskModalOpen(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleCreateManualTask}
                className="px-4 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                建立任務
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  SubscriptionTier,
  AiCrmSystemConfig,
  AiCrmLead,
  AiCrmPushNotification,
  NotificationItem,
} from '../types';
import { getAiCrmLeadsForSolver, getAiCrmPushesForSolver } from '../services/aiService';
import { CopyableUserId } from './CopyableUserId';
import {
  Sparkles,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  Users,
  User,
  Radio,
  BarChart3,
  RefreshCw,
  Crown,
  Eye,
  Settings,
  HelpCircle,
  Save,
  MessageSquare,
  ShieldCheck,
  Flame,
  Plus,
  Zap,
  ShieldAlert,
  Bell,
  Trash2,
  Edit3,
  Filter,
  Check,
  X,
  Megaphone,
  Mail,
  Play,
  Search,
  Tag,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

export interface NotificationRule {
  id: string;
  name: string; // 通知名稱
  category: 'system' | 'personal'; // 系統通知 | 個人通知
  title: string; // 通知標題
  content: string; // 通知內容
  triggerCondition: string; // 觸發條件
  targetAudience: string; // 適用對象
  enabled: boolean; // 是否啟用
  updatedAt: string;
}

const DEFAULT_NOTIFICATION_RULES: NotificationRule[] = [
  {
    id: 'rule-new-answer',
    name: '專家提交落地方案通知',
    category: 'personal',
    title: '新解答方案已提交',
    content: '顧問已為您的懸賞問題提交「商業策略架構」深度方案，歡迎前往查看預覽與解鎖。',
    triggerCondition: '當任何解答者或專家針對問題提交付費落地方案時自動觸發',
    targetAudience: '提問發案方 (Questioner)',
    enabled: true,
    updatedAt: '2026-09-30 20:00',
  },
  {
    id: 'rule-ai-match',
    name: 'AI 智慧專家媒合推薦通知',
    category: 'personal',
    title: 'AI 智慧專家媒合推薦',
    content: '您的問題已有推薦解答者，媒合度最高達 96%！點擊立即檢視推薦智庫專家名單。',
    triggerCondition: '發布問題後 AI 智能計算題意並完成專家庫契合度比對時自動觸發',
    targetAudience: '提問發案方 (Questioner)',
    enabled: true,
    updatedAt: '2026-09-30 20:00',
  },
  {
    id: 'rule-expert-certified',
    name: '智庫專家實名審核通過通知',
    category: 'personal',
    title: '【專家資格認證通過】',
    content: '恭喜您！您的智庫專家資格已通過管理團隊審查。您的帳號現已獲得官方「智庫專家」認證徽章，並開通優先推薦曝光。',
    triggerCondition: '管理員於後台「受理認證」中核准專家實名資格時自動觸發',
    targetAudience: '專家解答者 (Solver)',
    enabled: true,
    updatedAt: '2026-09-30 20:00',
  },
  {
    id: 'rule-solution-accepted',
    name: '方案驗收採納與放款通知',
    category: 'personal',
    title: '方案交付已確認放款！',
    content: '發案方已確認完成方案驗收，第三方託管點數已安全撥付至您的帳戶可用餘額。',
    triggerCondition: '提問者於聊天室或案件管理中點擊「確認驗收 / 採納放款」時自動觸發',
    targetAudience: '專家解答者 (Solver)',
    enabled: true,
    updatedAt: '2026-09-30 20:00',
  },
  {
    id: 'rule-points-recharge',
    name: '點數儲值與扣款回執通知',
    category: 'personal',
    title: '點數交易與錢包變動通知',
    content: '您已成功完成點數儲值/扣款異動，點數已入帳，可隨時至儀表板確認交易明細。',
    triggerCondition: '用戶完成綠界/藍新信用卡儲值付款或懸賞預扣點數時自動觸發',
    targetAudience: '全體會員 (All)',
    enabled: true,
    updatedAt: '2026-09-30 20:00',
  },
  {
    id: 'rule-ai-crm-followup',
    name: 'AI-CRM 商機追蹤與猶豫期提醒',
    category: 'personal',
    title: 'AI-CRM 商機追蹤推播',
    content: '偵測到關注問題已有超過 3 天猶豫期之發案方，AI 獲客策略藍圖已就緒，點擊前往破冰！',
    triggerCondition: 'AI-CRM 定時巡航引擎掃描到符合提問者猶豫期門檻時自動推播給專家',
    targetAudience: '大師方案專家 (Master Solver)',
    enabled: true,
    updatedAt: '2026-09-30 20:00',
  },
  {
    id: 'rule-system-announcement',
    name: '全站系統公告與功能升級通知',
    category: 'system',
    title: '【官方公告】平台功能全面升級通知',
    content: '創點子 IdeaX 系統功能已升級，包含第三方價金託管保障與 AI 智能媒合引擎全面就緒。',
    triggerCondition: '管理員於系統管理發布重大平台更新公告或維護通知時向全站推播',
    targetAudience: '全體會員 (All)',
    enabled: true,
    updatedAt: '2026-09-30 20:00',
  },
  {
    id: 'rule-board-push',
    name: '主題看板熱門題目專屬推播',
    category: 'system',
    title: '📢 主題看板熱門難題加碼推播',
    content: '您關注的主題看板新增高額懸賞難題，邀請各界專家好手前往解答破局！',
    triggerCondition: '提問者啟用置頂推播或熱門題目點擊數超過閥值時自動廣播擴散',
    targetAudience: '全體會員 (All)',
    enabled: true,
    updatedAt: '2026-09-30 20:00',
  },
];

interface AdminAiCrmTabProps {
  onOpenAiCrm?: () => void;
}

export const AdminAiCrmTab: React.FC<AdminAiCrmTabProps> = ({ onOpenAiCrm }) => {
  const {
    currentUser,
    aiCrmConfig,
    updateAiCrmConfig,
    questions,
    solvers,
    availableUsers,
    notifications,
    allNotifications,
    personalNotifications,
    systemNotifications,
    addNotification,
    deleteNotification,
    clearAllNotifications,
    updateNotification,
  } = useApp();

  // Local form state for settings
  const [formData, setFormData] = useState<AiCrmSystemConfig>({
    isEnabled: aiCrmConfig?.isEnabled ?? true,
    requiredTier: aiCrmConfig?.requiredTier ?? 'master',
    hesitationDaysThreshold: aiCrmConfig?.hesitationDaysThreshold ?? 3,
    highIntentBountyThreshold: aiCrmConfig?.highIntentBountyThreshold ?? 3000,
    toneStyle: aiCrmConfig?.toneStyle ?? 'professional',
    autoScanIntervalHours: aiCrmConfig?.autoScanIntervalHours ?? 2,
    allowCustomTone: aiCrmConfig?.allowCustomTone ?? true,
    boardPushEnabled: aiCrmConfig?.boardPushEnabled ?? true,
    maxPushesPerDay: aiCrmConfig?.maxPushesPerDay ?? 5,
    scheduleMode: aiCrmConfig?.scheduleMode ?? 'smart_time_slots',
    peakIntervalHours: aiCrmConfig?.peakIntervalHours ?? 1,
    eveningIntervalHours: aiCrmConfig?.eveningIntervalHours ?? 2,
    offPeakIntervalHours: aiCrmConfig?.offPeakIntervalHours ?? 6,
  });

  const [activeSubTab, setActiveSubTab] = useState<'settings' | 'leads_pool' | 'broadcast_center' | 'notification_settings'>('settings');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanNotice, setScanNotice] = useState<string | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // Active leads pool state
  const [leadsPool, setLeadsPool] = useState<AiCrmLead[]>(() =>
    getAiCrmLeadsForSolver(currentUser?.domain || '資訊工程', currentUser?.skills || ['AI', '行銷'], questions)
  );

  // Broadcast list state
  const [broadcastList, setBroadcastList] = useState<AiCrmPushNotification[]>(() =>
    getAiCrmPushesForSolver(currentUser?.id)
  );

  // Form for manual broadcast creation
  const [newBroadcastAudience, setNewBroadcastAudience] = useState('關注「創新創業」與「AI技術」全體會員');
  const [newBroadcastEvent, setNewBroadcastEvent] = useState('主題看板新增大師方案專家解答');
  const [newBroadcastContent, setNewBroadcastContent] = useState('「您關注的主題看板剛新增了 2 則高質量解題方案，點擊立即預覽前沿思路！」');
  const [broadcastSuccessNotice, setBroadcastSuccessNotice] = useState<string | null>(null);

  const executeSaveSettings = () => {
    updateAiCrmConfig(formData);
    setSaveSuccessMsg('AI-CRM 系統運營設定已成功儲存！所有規則與演算法即刻在全站生效。');
    setIsConfirmModalOpen(false);
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  const handleTriggerRescan = () => {
    setIsScanning(true);
    setTimeout(() => {
      const refreshed = getAiCrmLeadsForSolver(
        currentUser?.domain || '資訊工程',
        currentUser?.skills || ['AI', '行銷'],
        questions
      );
      setLeadsPool(refreshed);
      setIsScanning(false);
      setScanNotice(`全站商機池已完成重新探測！共掃描 ${questions.length} 個題目，偵測出 ${refreshed.length} 筆高價值潛在客情商機。`);
      setTimeout(() => setScanNotice(null), 4000);
    }, 700);
  };

  const handleCreateBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBroadcastContent.trim()) return;

    const newPush: AiCrmPushNotification = {
      id: `push-admin-${Date.now()}`,
      targetAudience: newBroadcastAudience,
      triggerEvent: newBroadcastEvent,
      content: newBroadcastContent.trim(),
      status: 'sent',
      clicksCount: 1,
    };

    setBroadcastList([newPush, ...broadcastList]);
    setBroadcastSuccessNotice('系統級主動推播已成功派發至目標受眾推播佇列中！');
    setTimeout(() => setBroadcastSuccessNotice(null), 3500);
  };

  // Notification rules state (持久化於 localStorage)
  const [notificationRules, setNotificationRules] = useState<NotificationRule[]>(() => {
    try {
      const saved = localStorage.getItem('ideax_notification_rules');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_NOTIFICATION_RULES;
  });

  const [notificationFilter, setNotificationFilter] = useState<'all' | 'system' | 'personal'>('all');
  const [notificationSearch, setNotificationSearch] = useState('');
  const [editingRule, setEditingRule] = useState<NotificationRule | null>(null);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [isNewRule, setIsNewRule] = useState(false);
  const [ruleModalForm, setRuleModalForm] = useState<Omit<NotificationRule, 'id' | 'updatedAt'>>({
    name: '',
    category: 'personal',
    title: '',
    content: '',
    triggerCondition: '',
    targetAudience: '提問發案方 (Questioner)',
    enabled: true,
  });
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);
  const [notificationActionNotice, setNotificationActionNotice] = useState<string | null>(null);

  // Live dispatched notification management state
  const [editingLiveNotif, setEditingLiveNotif] = useState<NotificationItem | null>(null);
  const [liveNotifFilter, setLiveNotifFilter] = useState<'all' | 'system' | 'personal'>('all');
  const [liveNotifSearch, setLiveNotifSearch] = useState('');

  // 一鍵刪除全部通知確認彈窗
  const [isClearAllConfirmOpen, setIsClearAllConfirmOpen] = useState(false);

  // 選擇發送彈窗狀態（個人 vs 全站）
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [sendingRule, setSendingRule] = useState<NotificationRule | null>(null);
  const [sendTargetType, setSendTargetType] = useState<'personal' | 'broadcast'>('personal');
  const [selectedRecipientUserId, setSelectedRecipientUserId] = useState<string>('');
  const [recipientSearchQuery, setRecipientSearchQuery] = useState<string>('');
  const [targetAudienceSearchQuery, setTargetAudienceSearchQuery] = useState<string>('');
  const [isAudienceUserSearchOpen, setIsAudienceUserSearchOpen] = useState(false);
  const [sendCustomTitle, setSendCustomTitle] = useState<string>('');
  const [sendCustomMessage, setSendCustomMessage] = useState<string>('');
  const [sendCategory, setSendCategory] = useState<'system' | 'personal'>('personal');

  const saveNotificationRules = (rules: NotificationRule[]) => {
    setNotificationRules(rules);
    try {
      localStorage.setItem('ideax_notification_rules', JSON.stringify(rules));
    } catch {}
  };

  const handleToggleRule = (id: string) => {
    const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const updated = notificationRules.map((r) =>
      r.id === id ? { ...r, enabled: !r.enabled, updatedAt: nowStr } : r
    );
    saveNotificationRules(updated);
    const target = updated.find((r) => r.id === id);
    setNotificationActionNotice(`已${target?.enabled ? '啟用' : '停用'}「${target?.name}」觸發規則！`);
    setTimeout(() => setNotificationActionNotice(null), 3000);
  };

  const handleDeleteRule = (id: string) => {
    const target = notificationRules.find((r) => r.id === id);
    const updated = notificationRules.filter((r) => r.id !== id);
    saveNotificationRules(updated);
    setDeletingRuleId(null);
    setNotificationActionNotice(`已成功刪除「${target?.name || '通知規則'}」！`);
    setTimeout(() => setNotificationActionNotice(null), 3000);
  };

  const handleOpenAddRuleModal = () => {
    setIsNewRule(true);
    setEditingRule(null);
    setRuleModalForm({
      name: '',
      category: 'personal',
      title: '',
      content: '',
      triggerCondition: '',
      targetAudience: '提問發案方 (Questioner)',
      enabled: true,
    });
    setIsRuleModalOpen(true);
  };

  const handleOpenEditRuleModal = (rule: NotificationRule) => {
    setIsNewRule(false);
    setEditingRule(rule);
    setRuleModalForm({
      name: rule.name,
      category: rule.category,
      title: rule.title,
      content: rule.content,
      triggerCondition: rule.triggerCondition,
      targetAudience: rule.targetAudience,
      enabled: rule.enabled,
    });
    setIsRuleModalOpen(true);
  };

  const handleSaveRuleModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleModalForm.name.trim() || !ruleModalForm.title.trim() || !ruleModalForm.content.trim()) return;

    const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');
    if (isNewRule) {
      const newRuleItem: NotificationRule = {
        id: `rule-custom-${Date.now()}`,
        ...ruleModalForm,
        updatedAt: nowStr,
      };
      const updated = [newRuleItem, ...notificationRules];
      saveNotificationRules(updated);
      setNotificationActionNotice(`已成功新增通知觸發規則「${newRuleItem.name}」！`);
    } else if (editingRule) {
      const updated = notificationRules.map((r) =>
        r.id === editingRule.id
          ? {
              ...r,
              ...ruleModalForm,
              updatedAt: nowStr,
            }
          : r
      );
      saveNotificationRules(updated);
      setNotificationActionNotice(`已成功修訂「${ruleModalForm.name}」名稱、內容與觸發條件！`);
    }
    setIsRuleModalOpen(false);
    setEditingRule(null);
    setTimeout(() => setNotificationActionNotice(null), 3500);
  };

  const handleOpenSendModal = (rule: NotificationRule) => {
    setSendingRule(rule);
    setSendTargetType('personal');
    setSelectedRecipientUserId(currentUser?.id || availableUsers[0]?.id || '');
    setRecipientSearchQuery('');
    setSendCustomTitle(rule.title);
    setSendCustomMessage(rule.content);
    setSendCategory(rule.category);
    setIsSendModalOpen(true);
  };

  const handleConfirmSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sendingRule || !sendCustomTitle.trim() || !sendCustomMessage.trim()) return;

    if (sendTargetType === 'broadcast') {
      addNotification({
        title: sendCustomTitle.trim(),
        message: sendCustomMessage.trim(),
        category: sendCategory,
        type: sendCategory === 'system' ? 'system' : 'ai_match',
        userId: 'all',
        createdAt: '剛剛',
      });
      setNotificationActionNotice(`📢 已成功將「${sendingRule.name}」以全站廣播形式發送給全體會員！`);
    } else {
      const recipient = availableUsers.find((u) => u.id === selectedRecipientUserId);
      const recipientName = recipient?.name || (selectedRecipientUserId === currentUser?.id ? '您自己' : '指定個人');
      addNotification({
        title: sendCustomTitle.trim(),
        message: sendCustomMessage.trim(),
        category: sendCategory,
        type: sendCategory === 'system' ? 'system' : 'ai_match',
        userId: selectedRecipientUserId || currentUser?.id,
        createdAt: '剛剛',
      });
      setNotificationActionNotice(`✉️ 已成功將「${sendingRule.name}」發送給「${recipientName}」！`);
    }

    setIsSendModalOpen(false);
    setSendingRule(null);
    setTimeout(() => setNotificationActionNotice(null), 4000);
  };

  const handleConfirmClearAll = () => {
    clearAllNotifications();
    setIsClearAllConfirmOpen(false);
    setNotificationActionNotice('已成功一鍵刪除全站所有通知紀錄！');
    setTimeout(() => setNotificationActionNotice(null), 3500);
  };

  const handleResetDefaultRules = () => {
    saveNotificationRules(DEFAULT_NOTIFICATION_RULES);
    setNotificationActionNotice('已成功將所有通知規則與觸發條件重置為官方預設版本！');
    setTimeout(() => setNotificationActionNotice(null), 3000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner / Description */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-stone-900 via-amber-950 to-stone-900 text-white border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Sparkles className="w-4 h-4" />
            </span>
            <h2 className="text-base sm:text-lg font-black text-amber-300">
              AI-CRM與通知設定・後台營運控制中心
            </h2>
            <span
              className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                formData.isEnabled ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
              }`}
            >
              {formData.isEnabled ? '系統運作中' : '系統已暫停'}
            </span>
          </div>
          <p className="text-xs text-stone-300 max-w-2xl leading-relaxed">
            設定全站 AI 追蹤演算法、提問者猶豫期跟進觸發天數、推播擴散門檻與話術風格。支持管理員即時監控全站客情商機動態並發布系統廣播。
          </p>
        </div>

        {onOpenAiCrm && (
          <button
            type="button"
            onClick={onOpenAiCrm}
            className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-xs"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>預覽專家端視角</span>
          </button>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs">
          <span className="text-[11px] text-stone-500 font-bold block">AI-CRM 總運行狀態</span>
          <span className={`text-lg font-black mt-1 block ${formData.isEnabled ? 'text-emerald-700' : 'text-stone-400'}`}>
            {formData.isEnabled ? '● 正常啟用中' : '○ 已手動停用'}
          </span>
          <span className="text-[10px] text-stone-400 mt-0.5 block">
            {formData.boardPushEnabled ? '主題看板推播：開' : '主題看板推播：關'}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 shadow-2xs">
          <span className="text-[11px] text-amber-800 font-bold block">猶豫期偵測天數</span>
          <span className="text-xl font-black text-amber-900 font-mono mt-1 block">
            {formData.hesitationDaysThreshold} 天
          </span>
          <span className="text-[10px] text-amber-700 mt-0.5 block">提問者未回覆即觸發跟進</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs">
          <span className="text-[11px] text-stone-500 font-bold block">目前商機池動態</span>
          <span className="text-xl font-black text-stone-900 font-mono mt-1 block">
            {leadsPool.length} 筆
          </span>
          <span className="text-[10px] text-stone-400 mt-0.5 block">
            高意向案件：{leadsPool.filter((l) => l.urgency === 'high').length} 筆
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 shadow-2xs">
          <span className="text-[11px] text-stone-500 font-bold block">最低方案解鎖門檻</span>
          <span className="text-sm font-black text-purple-900 mt-1 block flex items-center gap-1">
            <Crown className="w-3.5 h-3.5 text-purple-600" />
            <span>
              {formData.requiredTier === 'master'
                ? '大師方案 (Master)'
                : formData.requiredTier === 'authority'
                ? '權威方案以上'
                : formData.requiredTier === 'expert'
                ? '專家方案以上'
                : '全體會員開放'}
            </span>
          </span>
          <span className="text-[10px] text-stone-400 mt-0.5 block">高端解答者專屬權益</span>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 text-xs font-bold overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSubTab('settings')}
          className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeSubTab === 'settings'
              ? 'border-purple-600 text-purple-900 font-black'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>核心功能設定與參數</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('leads_pool')}
          className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeSubTab === 'leads_pool'
              ? 'border-purple-600 text-purple-900 font-black'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>全站商機池與客情監控 ({leadsPool.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('broadcast_center')}
          className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeSubTab === 'broadcast_center'
              ? 'border-purple-600 text-purple-900 font-black'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>主動推播廣播中心 ({broadcastList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('notification_settings')}
          className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeSubTab === 'notification_settings'
              ? 'border-purple-600 text-purple-900 font-black'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>通知設定 ({notificationRules.length})</span>
        </button>
      </div>

      {/* SUBTAB 1: SETTINGS */}
      {activeSubTab === 'settings' && (
        <div className="space-y-6">
          {saveSuccessMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 space-y-6 shadow-2xs">
            {/* Section 1: System Switch & Access Tier */}
            <div className="space-y-4">
              <h3 className="font-extrabold text-sm sm:text-base text-stone-900 flex items-center gap-2 border-b border-stone-100 pb-2">
                <Settings className="w-4 h-4 text-purple-600" />
                <span>1. 全域運行狀態與方案權限</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Switch */}
                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-stone-900 block">AI-CRM 系統總開關</label>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      停用時，專家後台與通知中心將暫停客情跟進與商機提醒
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isEnabled: !formData.isEnabled })}
                    className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                      formData.isEnabled ? 'bg-purple-600' : 'bg-stone-300'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                        formData.isEnabled ? 'left-6.5' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>

                {/* Required Tier */}
                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 space-y-1.5">
                  <label className="text-xs font-bold text-stone-900 block">解鎖最低資格方案</label>
                  <p className="text-[11px] text-stone-500">決定哪些等級的解答者可使用主動跟進與 AI-CRM 功能</p>
                  <select
                    value={formData.requiredTier}
                    onChange={(e) => setFormData({ ...formData, requiredTier: e.target.value as SubscriptionTier })}
                    className="w-full mt-1 p-2 rounded-lg border border-stone-300 text-xs font-bold bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-300"
                  >
                    <option value="master">⭐️ 大師方案 (Master) - 官方推薦</option>
                    <option value="authority">權威方案 (Authority) 以上</option>
                    <option value="expert">專家方案 (Expert) 以上</option>
                    <option value="pro">進階方案 (Pro) 以上</option>
                    <option value="free">全體會員開放 (Free)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Algorithm Parameters & Time-Slot Patrol Strategy */}
            <div className="space-y-4">
              <h3 className="font-extrabold text-sm sm:text-base text-stone-900 flex items-center gap-2 border-b border-stone-100 pb-2">
                <Zap className="w-4 h-4 text-amber-600" />
                <span>2. 定期巡航排程與各時段巡檢週期自訂</span>
              </h3>

              {/* 巡航策略模式切換 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, scheduleMode: 'smart_time_slots' }))}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    formData.scheduleMode === 'smart_time_slots'
                      ? 'bg-purple-50/80 border-purple-400 shadow-xs ring-2 ring-purple-300/40'
                      : 'bg-white border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-stone-900 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-purple-600" />
                      <span>按時段動態調整策略（推薦・黃金配置）</span>
                    </span>
                    {formData.scheduleMode === 'smart_time_slots' && (
                      <CheckCircle2 className="w-4 h-4 text-purple-600" />
                    )}
                  </div>
                  <p className="text-[11px] text-stone-500 mt-1 leading-relaxed">
                    尖峰 1h 敏捷巡航、晚間 2h 深度分析、深夜 6h 節能深層重整。
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, scheduleMode: 'fixed_interval' }))}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    formData.scheduleMode === 'fixed_interval'
                      ? 'bg-purple-50/80 border-purple-400 shadow-xs ring-2 ring-purple-300/40'
                      : 'bg-white border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-stone-900 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-stone-600" />
                      <span>固定間隔巡航模式</span>
                    </span>
                    {formData.scheduleMode === 'fixed_interval' && (
                      <CheckCircle2 className="w-4 h-4 text-purple-600" />
                    )}
                  </div>
                  <p className="text-[11px] text-stone-500 mt-1 leading-relaxed">
                    全天 24 小時維持單一固定頻率進行全站掃描分析。
                  </p>
                </button>
              </div>

              {/* 各時段自訂巡檢週期配置 */}
              {formData.scheduleMode === 'smart_time_slots' ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* 日間活躍期 */}
                  <div className="p-3.5 rounded-xl bg-emerald-50/40 border border-emerald-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-950 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>日間商務活躍期</span>
                      </span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        09:00 - 18:00
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] text-stone-600 shrink-0 font-bold">巡檢週期:</label>
                      <select
                        value={formData.peakIntervalHours || 1}
                        onChange={(e) => setFormData(prev => ({ ...prev, peakIntervalHours: Number(e.target.value) || 1 }))}
                        className="w-full px-2 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-bold font-mono cursor-pointer"
                      >
                        <option value={1}>每 1 小時 (敏捷推薦)</option>
                        <option value={2}>每 2 小時 (標準)</option>
                        <option value={3}>每 3 小時 (適中)</option>
                        <option value={4}>每 4 小時</option>
                      </select>
                    </div>
                    <p className="text-[10px] text-stone-500">重心：鎖定新發懸賞、即時比價與在線破冰</p>
                  </div>

                  {/* 晚間沉思期 */}
                  <div className="p-3.5 rounded-xl bg-amber-50/40 border border-amber-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-950 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <span>晚間決策沉思期</span>
                      </span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                        18:00 - 23:30
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] text-stone-600 shrink-0 font-bold">巡檢週期:</label>
                      <select
                        value={formData.eveningIntervalHours || 2}
                        onChange={(e) => setFormData(prev => ({ ...prev, eveningIntervalHours: Number(e.target.value) || 2 }))}
                        className="w-full px-2 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-bold font-mono cursor-pointer"
                      >
                        <option value={1}>每 1 小時</option>
                        <option value={2}>每 2 小時 (黃金推薦)</option>
                        <option value={3}>每 3 小時</option>
                        <option value={4}>每 4 小時</option>
                      </select>
                    </div>
                    <p className="text-[10px] text-stone-500">重心：深度方案比對、信任里程碑與諮詢引導</p>
                  </div>

                  {/* 深夜離峰 */}
                  <div className="p-3.5 rounded-xl bg-purple-50/40 border border-purple-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-950 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-purple-500" />
                        <span>深夜離峰</span>
                      </span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">
                        23:30 - 09:00
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] text-stone-600 shrink-0 font-bold">巡檢週期:</label>
                      <select
                        value={formData.offPeakIntervalHours || 6}
                        onChange={(e) => setFormData(prev => ({ ...prev, offPeakIntervalHours: Number(e.target.value) || 6 }))}
                        className="w-full px-2 py-1.5 bg-white border border-purple-300 rounded-lg text-xs font-bold font-mono cursor-pointer"
                      >
                        <option value={3}>每 3 小時</option>
                        <option value={4}>每 4 小時</option>
                        <option value={6}>每 6 小時 (節能推薦)</option>
                        <option value={8}>每 8 小時</option>
                        <option value={12}>每 12 小時</option>
                      </select>
                    </div>
                    <p className="text-[10px] text-stone-500">重心：整理未解決問題，排定明早優先追蹤名單</p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-900">固定全天巡檢週期</span>
                    <span className="text-xs font-bold font-mono text-purple-700">每 {formData.autoScanIntervalHours || 2} 小時</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={12}
                    step={1}
                    value={formData.autoScanIntervalHours || 2}
                    onChange={(e) => setFormData(prev => ({ ...prev, autoScanIntervalHours: Number(e.target.value) || 2 }))}
                    className="w-full accent-purple-600 cursor-pointer h-2 bg-stone-200 rounded-lg"
                  />
                </div>
              )}

              {/* 門檻參數 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Hesitation Days */}
                <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 space-y-1.5">
                  <label className="text-xs font-bold text-amber-950 block">提問者猶豫期閾值 (天)</label>
                  <p className="text-[10px] text-amber-800/80">提問者查閱提案後超過此天數未回覆，生成主動跟進提醒</p>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="number"
                      min={1}
                      max={14}
                      value={formData.hesitationDaysThreshold}
                      onChange={(e) =>
                        setFormData({ ...formData, hesitationDaysThreshold: Math.max(1, Number(e.target.value) || 1) })
                      }
                      className="w-24 p-2 rounded-lg border border-amber-300 text-xs font-bold bg-white text-stone-900 text-center"
                    />
                    <span className="text-xs font-bold text-amber-950">天</span>
                  </div>
                </div>

                {/* High Intent Bounty Threshold */}
                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-1.5">
                  <label className="text-xs font-bold text-stone-900 block">高意向懸賞門檻 (NT$)</label>
                  <p className="text-[10px] text-stone-500">懸賞金額達標之案件自動標記為「🔥 高意向優先跟進」</p>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="number"
                      min={500}
                      step={500}
                      value={formData.highIntentBountyThreshold}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          highIntentBountyThreshold: Math.max(500, Number(e.target.value) || 500),
                        })
                      }
                      className="w-28 p-2 rounded-lg border border-stone-300 text-xs font-bold bg-white text-stone-900 text-center"
                    />
                    <span className="text-xs font-bold text-stone-700">元</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: AI Tone & Features */}
            <div className="space-y-4">
              <h3 className="font-extrabold text-sm sm:text-base text-stone-900 flex items-center gap-2 border-b border-stone-100 pb-2">
                <MessageSquare className="w-4 h-4 text-indigo-600" />
                <span>3. AI 擬定訊息話術語氣與擴散功能</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tone Style */}
                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-1.5">
                  <label className="text-xs font-bold text-stone-900 block">AI 建議訊息預設語氣風格</label>
                  <p className="text-[11px] text-stone-500">演算法在為專家自動擬定溝通話術時採用的表達風格</p>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {[
                      { id: 'professional', label: '專業顧問風', desc: '條理分明、引用方法論與避坑指南' },
                      { id: 'consultative', label: '諮詢引導風', desc: '痛點深挖、先同理再提供初步架構' },
                      { id: 'friendly', label: '親切熱情風', desc: '主動真誠、建立夥伴般的信任交流' },
                      { id: 'efficient', label: '商務高效風', desc: '直切重點、量化成效與快速交付承諾' },
                    ].map((tone) => (
                      <button
                        key={tone.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, toneStyle: tone.id as any })}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                          formData.toneStyle === tone.id
                            ? 'bg-purple-100 border-purple-500 text-purple-950 font-black'
                            : 'bg-white border-stone-200 hover:border-stone-300 text-stone-700'
                        }`}
                      >
                        <span className="text-xs font-bold block">{tone.label}</span>
                        <span className="text-[10px] text-stone-500 block mt-0.5">{tone.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Additional Toggles */}
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-stone-900 block">主題看板主動推播擴散</span>
                      <span className="text-[10px] text-stone-500 block mt-0.5">
                        當提問者進入相關領域主題看板時，系統主動發送優選大師解題方案
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, boardPushEnabled: !formData.boardPushEnabled })}
                      className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                        formData.boardPushEnabled ? 'bg-amber-500' : 'bg-stone-300'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                          formData.boardPushEnabled ? 'left-5.5' : 'left-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-stone-900 block">允許專家編輯 AI 話術</span>
                      <span className="text-[10px] text-stone-500 block mt-0.5">
                        在專家 CRM 介面，專家可直接對 AI 建議訊息點擊發送或自由編輯修改
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, allowCustomTone: !formData.allowCustomTone })}
                      className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                        formData.allowCustomTone ? 'bg-purple-600' : 'bg-stone-300'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                          formData.allowCustomTone ? 'left-5.5' : 'left-0.5'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* AI-CRM 法律與運營免責提醒 */}
            <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-200/70 text-[11px] text-purple-900 leading-relaxed flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">【運營規範與 AI 免責告知】</strong>
                本設定調整之定時巡航週期與演算法參數，將直接影響系統向訂閱專家產出之客情分析與話術。各項分析與建議僅供溝通參考，不構成任何商業成交保證，請依平台《免責聲明》第八條嚴格遵循中立技術服務原則。
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(true)}
                className="px-6 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 active:scale-95 text-white font-bold text-xs shadow-sm flex items-center gap-2 cursor-pointer transition-all"
              >
                <Save className="w-4 h-4" />
                <span>儲存 AI-CRM 設定</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 二次確認儲存彈窗 */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-stone-200 text-stone-900">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                <Sliders className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-stone-900">確認儲存 AI-CRM 系統運營設定？</h3>
                <span className="text-[11px] text-stone-500 font-bold">平台營運參數二次確認</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 text-xs text-stone-700 space-y-1.5 leading-relaxed">
              <p className="font-bold text-stone-900">即將生效之設定：</p>
              <ul className="list-disc list-inside space-y-1 text-stone-600 text-[11px]">
                <li>系統狀態：<strong>{formData.isEnabled ? '全面啟用' : '停用'}</strong></li>
                <li>最低開放門檻：<strong>{formData.requiredTier} 方案專家</strong></li>
                {formData.scheduleMode === 'smart_time_slots' ? (
                  <>
                    <li>巡航模式：<strong>按時段動態調整策略（推薦）</strong></li>
                    <li>日間商務活躍期 (09:00 - 18:00)：<strong>每 {formData.peakIntervalHours || 1} 小時巡檢</strong></li>
                    <li>晚間決策沉思期 (18:00 - 23:30)：<strong>每 {formData.eveningIntervalHours || 2} 小時巡檢</strong></li>
                    <li>深夜離峰 (23:30 - 09:00)：<strong>每 {formData.offPeakIntervalHours || 6} 小時深層重算</strong></li>
                  </>
                ) : (
                  <li>巡航模式：<strong>固定間隔（每 {formData.autoScanIntervalHours || 2} 小時巡檢）</strong></li>
                )}
                <li>猶豫期判定：<strong>{formData.hesitationDaysThreshold} 天未回覆</strong></li>
                <li>高意向懸賞門檻：<strong>NT$ {formData.highIntentBountyThreshold.toLocaleString()}</strong></li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-bold cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={executeSaveSettings}
                className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-xs font-black shadow-xs transition-all cursor-pointer"
              >
                確認儲存設定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: LEADS POOL MONITOR */}
      {activeSubTab === 'leads_pool' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-stone-900">
                全站即時 AI-CRM 客情商機動態監控池
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                系統當前正主動為各領域大師專家探測之潛在委託者、疑慮狀態與 AI 擬定話術
              </p>
            </div>

            <button
              type="button"
              disabled={isScanning}
              onClick={handleTriggerRescan}
              className="px-3.5 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? '演算掃描中...' : '強制全站重新掃描商機'}</span>
            </button>
          </div>

          {scanNotice && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{scanNotice}</span>
            </div>
          )}

          <div className="space-y-3">
            {leadsPool.map((lead, idx) => (
              <div
                key={lead.id || idx}
                className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 space-y-3 shadow-2xs"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <img
                      src={lead.clientAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                      alt={lead.clientName}
                      className="w-10 h-10 rounded-full object-cover border border-amber-300"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-stone-900">{lead.clientName}</h4>
                        <span className="text-xs text-stone-500">{lead.clientRole}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            lead.urgency === 'high' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {lead.urgency === 'high' ? '🔥 高意向案件' : '一般意向'}
                        </span>
                      </div>
                      <p className="text-xs text-stone-600 mt-0.5">
                        <span className="font-semibold text-amber-900">【狀態】：</span>
                        {lead.statusDescription}
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono text-stone-400 bg-stone-100 px-2.5 py-1 rounded-lg">
                    最後活躍：{lead.lastActiveTime}
                  </span>
                </div>

                {/* AI Insight */}
                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>AI 診斷：</span>
                  </div>
                  <p className="text-stone-700 leading-relaxed">{lead.aiInsight}</p>
                </div>

                {/* Suggested Message Preview */}
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs space-y-1">
                  <span className="font-bold text-stone-700 block">AI 擬定建議訊息預覽：</span>
                  <p className="text-stone-800 font-mono italic leading-relaxed">「{lead.suggestedMessage}」</p>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-stone-100">
                  <span className="text-stone-500">
                    行動策略：<strong>{lead.aiRecommendedAction}</strong>
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      lead.hasSent ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-700'
                    }`}
                  >
                    {lead.hasSent ? '已由專家發送' : '待專家點擊發送'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 3: BROADCAST CENTER */}
      {activeSubTab === 'broadcast_center' && (
        <div className="space-y-6">
          {/* Create Broadcast Box */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 space-y-4 shadow-2xs">
            <h3 className="font-extrabold text-sm sm:text-base text-stone-900 flex items-center gap-2">
              <Radio className="w-4 h-4 text-purple-600" />
              <span>發布系統級主動推播（全站主題擴散）</span>
            </h3>

            {broadcastSuccessNotice && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{broadcastSuccessNotice}</span>
              </div>
            )}

            <form onSubmit={handleCreateBroadcast} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-stone-800 block mb-1">目標受眾範圍</label>
                  <input
                    type="text"
                    value={newBroadcastAudience}
                    onChange={(e) => setNewBroadcastAudience(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-stone-300 text-xs bg-stone-50 focus:bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-300"
                    placeholder="如：關注『跨境電商』全體提問者"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-800 block mb-1">觸發事件說明</label>
                  <input
                    type="text"
                    value={newBroadcastEvent}
                    onChange={(e) => setNewBroadcastEvent(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-stone-300 text-xs bg-stone-50 focus:bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-300"
                    placeholder="如：主題看板新增大師方案解題"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-800 block mb-1">推播內容文案</label>
                <textarea
                  rows={2}
                  value={newBroadcastContent}
                  onChange={(e) => setNewBroadcastContent(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 text-xs bg-stone-50 focus:bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-300"
                  placeholder="輸入推播給使用者的文案"
                  required
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>立即發送此系統推播</span>
                </button>
              </div>
            </form>
          </div>

          {/* Broadcast History */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-xs sm:text-sm text-stone-800">全站系統推播排程與記錄</h4>
            {broadcastList.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-white border border-stone-200 flex items-center justify-between gap-4 shadow-2xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-900">
                      受眾：{item.targetAudience}
                    </span>
                    <span className="text-[10px] text-stone-400">觸發：{item.triggerEvent}</span>
                  </div>
                  <p className="text-xs text-stone-800 font-medium">「{item.content}」</p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full block">
                    已派送
                  </span>
                  <span className="text-[10px] text-stone-400 mt-1 block">點擊量：{item.clicksCount || 0} 次</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 4: NOTIFICATION SETTINGS (通知設定) */}
      {activeSubTab === 'notification_settings' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Action notice banner */}
          {notificationActionNotice && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-between gap-2 shadow-2xs animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{notificationActionNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setNotificationActionNotice(null)}
                className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Top Info & Actions Card */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-stone-900 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-purple-600" />
                  <span>通知設定中心・系統通知與個人通知管理</span>
                </h3>
                <p className="text-xs text-stone-500 mt-1">
                  自由自訂各項系統通知與個人通知的名稱、標題、文案內容、適用對象與觸發條件，支援即時測試觸發與啟用開關。
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleResetDefaultRules}
                  className="px-3.5 py-2 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                  title="將所有通知重置為系統官方標準版"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-stone-500" />
                  <span>恢復官方預設</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenAddRuleModal}
                  className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>新增通知規則</span>
                </button>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="pt-2 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <button
                  type="button"
                  onClick={() => setNotificationFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                    notificationFilter === 'all'
                      ? 'bg-purple-700 text-white shadow-2xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  <span>全部通知</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
                    {notificationRules.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setNotificationFilter('system')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                    notificationFilter === 'system'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  <Megaphone className="w-3.5 h-3.5" />
                  <span>系統通知</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
                    {notificationRules.filter((r) => r.category === 'system').length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setNotificationFilter('personal')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                    notificationFilter === 'personal'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>個人通知</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
                    {notificationRules.filter((r) => r.category === 'personal').length}
                  </span>
                </button>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={notificationSearch}
                  onChange={(e) => setNotificationSearch(e.target.value)}
                  placeholder="搜尋通知名稱、標題或觸發條件..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-stone-200 text-xs bg-stone-50 focus:bg-white text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
                {notificationSearch && (
                  <button
                    type="button"
                    onClick={() => setNotificationSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Notification Rules List */}
          <div className="space-y-3.5">
            {notificationRules
              .filter((rule) => {
                if (notificationFilter !== 'all' && rule.category !== notificationFilter) return false;
                if (notificationSearch.trim()) {
                  const q = notificationSearch.toLowerCase();
                  return (
                    rule.name.toLowerCase().includes(q) ||
                    rule.title.toLowerCase().includes(q) ||
                    rule.content.toLowerCase().includes(q) ||
                    rule.triggerCondition.toLowerCase().includes(q) ||
                    rule.targetAudience.toLowerCase().includes(q)
                  );
                }
                return true;
              })
              .map((rule) => {
                const isSystem = rule.category === 'system';
                return (
                  <div
                    key={rule.id}
                    className={`p-4 sm:p-5 rounded-2xl bg-white border transition-all shadow-2xs space-y-3 ${
                      rule.enabled
                        ? 'border-stone-200 hover:border-purple-300'
                        : 'border-stone-200/60 opacity-60 bg-stone-50/60'
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 ${
                              isSystem
                                ? 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                                : 'bg-amber-100 text-amber-900 border border-amber-200'
                            }`}
                          >
                            {isSystem ? <Megaphone className="w-3 h-3 text-indigo-700" /> : <Mail className="w-3 h-3 text-amber-700" />}
                            <span>{isSystem ? '系統通知 (System)' : '個人通知 (Personal)'}</span>
                          </span>

                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 border border-stone-200">
                            受眾：{rule.targetAudience}
                          </span>

                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              rule.enabled
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-stone-200 text-stone-500'
                            }`}
                          >
                            {rule.enabled ? '● 啟用中' : '○ 已停用'}
                          </span>
                        </div>

                        <h4 className="text-sm sm:text-base font-black text-stone-900 pt-0.5">
                          {rule.name}
                        </h4>
                      </div>

                      {/* Right controls: Enable Switch & Quick Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleRule(rule.id)}
                          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                            rule.enabled
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-stone-100 text-stone-600 border-stone-300 hover:bg-stone-200'
                          }`}
                          title={rule.enabled ? '點擊停用此通知' : '點擊啟用此通知'}
                        >
                          {rule.enabled ? <ToggleRight className="w-4 h-4 text-emerald-600" /> : <ToggleLeft className="w-4 h-4 text-stone-400" />}
                          <span>{rule.enabled ? '已啟用' : '已停用'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Trigger Condition Box */}
                    <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-200/80 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-purple-950">
                        <Zap className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span>觸發條件：</span>
                        <span className="font-normal text-stone-700">{rule.triggerCondition}</span>
                      </div>
                    </div>

                    {/* Notification Preview Content */}
                    <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-xs space-y-1.5">
                      <div className="flex items-center gap-1.5 text-stone-900 font-bold">
                        <Bell className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                        <span>預設通知標題：</span>
                        <span className="text-purple-900 font-extrabold">{rule.title}</span>
                      </div>
                      <div className="text-stone-700 leading-relaxed pl-5 font-mono text-[11px] bg-white p-2 rounded-lg border border-stone-200/80">
                        {rule.content}
                      </div>
                    </div>

                    {/* Footer Row: Timestamp & Action Buttons */}
                    <div className="flex items-center justify-between gap-3 pt-1 border-t border-stone-100 text-xs flex-wrap">
                      <span className="text-[11px] text-stone-400 font-mono">
                        最近修訂：{rule.updatedAt}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenSendModal(rule)}
                          className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs flex items-center gap-1.5 border border-amber-200 transition-all cursor-pointer active:scale-95 shadow-2xs"
                          title="選擇發送給特定個人或全站廣播"
                        >
                          <Send className="w-3 h-3 text-amber-600" />
                          <span>選擇發送</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEditRuleModal(rule)}
                          className="px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-purple-50 text-stone-700 hover:text-purple-900 font-bold text-xs flex items-center gap-1 border border-stone-200 transition-all cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>編輯</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeletingRuleId(rule.id)}
                          className="p-1.5 rounded-xl hover:bg-rose-50 text-stone-400 hover:text-rose-600 transition-all cursor-pointer border border-transparent hover:border-rose-200"
                          title="刪除此通知設定"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

            {notificationRules.length === 0 && (
              <div className="p-8 text-center bg-white rounded-2xl border border-stone-200 space-y-3">
                <Bell className="w-8 h-8 text-stone-300 mx-auto" />
                <p className="text-sm font-bold text-stone-700">目前尚無通知設定規則</p>
                <button
                  type="button"
                  onClick={handleResetDefaultRules}
                  className="px-4 py-2 rounded-xl bg-purple-700 text-white text-xs font-bold cursor-pointer"
                >
                  恢復官方預設規則
                </button>
              </div>
            )}
          </div>

          {/* 全站通知紀錄 */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap">
              <div>
                <h4 className="text-sm font-black text-stone-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-600" />
                  <span>全站通知紀錄</span>
                </h4>
                <p className="text-xs text-stone-500 mt-0.5">
                  目前全站通知紀錄，共 {(allNotifications || notifications).length} 則（系統通知 {(allNotifications || notifications).filter((n) => n.category === 'system').length} 則 • 個人通知 {(allNotifications || notifications).filter((n) => n.category === 'personal').length} 則）
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsClearAllConfirmOpen(true)}
                  disabled={(allNotifications || notifications).length === 0}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                    (allNotifications || notifications).length > 0
                      ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 hover:border-rose-300 shadow-2xs active:scale-95'
                      : 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed'
                  }`}
                  title="一鍵清除全站所有歷史通知紀錄"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>一鍵刪除全部通知</span>
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {(allNotifications || notifications).length === 0 ? (
                <div className="p-6 text-center text-xs text-stone-400 bg-stone-50 rounded-xl border border-dashed border-stone-200">
                  目前全站尚無通知紀錄。點擊上方任一規則的「選擇發送」即可派送通知至全站或指定個人。
                </div>
              ) : (
                (allNotifications || notifications).map((notif) => (
                  <div
                    key={notif.id}
                    className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[9.5px] font-black px-1.5 py-0.2 rounded-md ${
                            notif.category === 'system'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {notif.category === 'system' ? '系統' : '個人'}
                        </span>
                        <span className="font-bold text-stone-900">{notif.title}</span>
                        <span className="text-[10px] text-stone-400 font-mono">{notif.createdAt}</span>
                        {notif.userId && notif.userId !== 'all' && (
                          <span className="text-[10px] text-stone-500 font-mono bg-white px-1.5 py-0.2 rounded border border-stone-200">
                            對象: {availableUsers.find((u) => u.id === notif.userId)?.name || notif.userId}
                          </span>
                        )}
                        {notif.userId === 'all' && (
                          <span className="text-[10px] text-purple-700 font-bold bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">
                            📢 全站廣播
                          </span>
                        )}
                      </div>
                      <p className="text-stone-600 text-[11px] leading-relaxed">{notif.message}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => deleteNotification(notif.id)}
                      className="text-stone-400 hover:text-rose-600 p-1 rounded-lg hover:bg-white cursor-pointer transition-colors shrink-0"
                      title="刪除此則紀錄"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: 編輯 / 新增通知設定與觸發條件 */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-stone-200 text-stone-900 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <Bell className="w-4 h-4 text-purple-700" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900">
                    {isNewRule ? '新增通知與觸發規則' : '編輯通知設定與觸發條件'}
                  </h3>
                  <span className="text-[11px] text-stone-500 font-bold">
                    自訂通知名稱、文案內容與觸發判定時機
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRuleModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRuleModal} className="space-y-3.5 text-xs">
              {/* Category & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-800 block mb-1">通知分類</label>
                  <select
                    value={ruleModalForm.category}
                    onChange={(e) =>
                      setRuleModalForm({ ...ruleModalForm, category: e.target.value as 'system' | 'personal' })
                    }
                    className="w-full p-2.5 rounded-xl border border-stone-300 text-xs bg-stone-50 focus:bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  >
                    <option value="personal">個人通知 (Personal)</option>
                    <option value="system">系統通知 (System)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-800 block mb-1">啟用狀態</label>
                  <select
                    value={ruleModalForm.enabled ? 'true' : 'false'}
                    onChange={(e) =>
                      setRuleModalForm({ ...ruleModalForm, enabled: e.target.value === 'true' })
                    }
                    className="w-full p-2.5 rounded-xl border border-stone-300 text-xs bg-stone-50 focus:bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  >
                    <option value="true">● 啟用中</option>
                    <option value="false">○ 已停用</option>
                  </select>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="text-xs font-bold text-stone-800 block mb-1">
                  通知名稱 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={ruleModalForm.name}
                  onChange={(e) => setRuleModalForm({ ...ruleModalForm, name: e.target.value })}
                  placeholder="如：專家提交落地方案通知"
                  className="w-full p-2.5 rounded-xl border border-stone-300 text-xs bg-stone-50 focus:bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  required
                />
              </div>

              {/* Target Audience */}
              <div>
                <label className="text-xs font-bold text-stone-800 block mb-1">
                  適用對象 / 受眾
                </label>
                <input
                  type="text"
                  value={ruleModalForm.targetAudience}
                  onChange={(e) => setRuleModalForm({ ...ruleModalForm, targetAudience: e.target.value })}
                  placeholder="如：提問發案方 (Questioner)、全體會員 (All)"
                  className="w-full p-2.5 rounded-xl border border-stone-300 text-xs bg-stone-50 focus:bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>

              {/* Trigger Condition */}
              <div>
                <label className="text-xs font-bold text-stone-800 block mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-purple-600" />
                    <span>觸發條件說明</span>
                  </span>
                  <span className="text-[10.5px] text-stone-400">觸發此通知之業務時機</span>
                </label>
                <textarea
                  rows={2}
                  value={ruleModalForm.triggerCondition}
                  onChange={(e) => setRuleModalForm({ ...ruleModalForm, triggerCondition: e.target.value })}
                  placeholder="描述當何種事件發生時發送，如：當任何解答者或專家針對問題提交付費落地方案時自動觸發"
                  className="w-full p-2.5 rounded-xl border border-stone-300 text-xs bg-stone-50 focus:bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  required
                />
              </div>

              {/* Title */}
              <div>
                <label className="text-xs font-bold text-stone-800 block mb-1">
                  預設通知標題 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={ruleModalForm.title}
                  onChange={(e) => setRuleModalForm({ ...ruleModalForm, title: e.target.value })}
                  placeholder="如：新解答方案已提交"
                  className="w-full p-2.5 rounded-xl border border-stone-300 text-xs bg-stone-50 focus:bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  required
                />
              </div>

              {/* Content */}
              <div>
                <label className="text-xs font-bold text-stone-800 block mb-1">
                  預設通知內容文案 <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={ruleModalForm.content}
                  onChange={(e) => setRuleModalForm({ ...ruleModalForm, content: e.target.value })}
                  placeholder="輸入派發給用戶的通知詳細內容..."
                  className="w-full p-2.5 rounded-xl border border-stone-300 text-xs bg-stone-50 focus:bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  required
                />
              </div>

              {/* Form buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsRuleModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-bold cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-black shadow-xs transition-all cursor-pointer active:scale-95"
                >
                  {isNewRule ? '確認新增通知' : '儲存變更'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: 刪除確認彈窗 */}
      {deletingRuleId && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-stone-200 text-stone-900 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-stone-900">確認刪除此通知設定？</h3>
                <span className="text-[11px] text-stone-500 font-bold">
                  {notificationRules.find((r) => r.id === deletingRuleId)?.name}
                </span>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              刪除後此項通知觸發規則將不再於全站執行派發。若後續需要，您可隨時透過「恢復官方預設」或「新增通知規則」重新建立。
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setDeletingRuleId(null)}
                className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-bold cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => handleDeleteRule(deletingRuleId)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-xs cursor-pointer active:scale-95"
              >
                確認刪除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: 選擇發送通知（個人 vs 全站） */}
      {isSendModalOpen && sendingRule && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-stone-200 text-stone-900 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <Send className="w-4 h-4 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900">
                    選擇發送通知
                  </h3>
                  <span className="text-[11px] text-stone-500 font-bold">
                    通知規則：{sendingRule.name}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSendModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmSend} className="space-y-4 text-xs">
              {/* 1. 選擇發送目標：個人 vs 全站 */}
              <div>
                <label className="text-xs font-bold text-stone-800 block mb-1.5">
                  發送對象範圍 <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSendTargetType('personal')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                      sendTargetType === 'personal'
                        ? 'bg-amber-50/80 border-amber-400 text-amber-950 shadow-xs ring-2 ring-amber-300/40'
                        : 'bg-white hover:bg-stone-50 border-stone-200 text-stone-700'
                    }`}
                  >
                    <div className={`p-2 rounded-xl shrink-0 ${sendTargetType === 'personal' ? 'bg-amber-500 text-white' : 'bg-stone-100 text-stone-600'}`}>
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-black text-xs block">發送給個人</span>
                      <span className="text-[10.5px] text-stone-500 mt-0.5 block">
                        指定單一會員用戶派送專屬通知
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSendTargetType('broadcast')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                      sendTargetType === 'broadcast'
                        ? 'bg-purple-50/80 border-purple-400 text-purple-950 shadow-xs ring-2 ring-purple-300/40'
                        : 'bg-white hover:bg-stone-50 border-stone-200 text-stone-700'
                    }`}
                  >
                    <div className={`p-2 rounded-xl shrink-0 ${sendTargetType === 'broadcast' ? 'bg-purple-600 text-white' : 'bg-stone-100 text-stone-600'}`}>
                      <Megaphone className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-black text-xs block">發送給全站</span>
                      <span className="text-[10.5px] text-stone-500 mt-0.5 block">
                        向全體會員廣播發送通知
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* 2. 個人對象選擇器 (支援人名與 ID 搜尋，每個用戶 ID 公開可複製) */}
              {sendTargetType === 'personal' && (
                <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-amber-600" />
                      <span>指定接收會員（支援搜尋人名或 ID）</span>
                    </label>
                    <span className="text-[10.5px] text-stone-400">
                      共 {availableUsers.length} 位會員
                    </span>
                  </div>

                  {/* 當前選取的用戶展示卡片 */}
                  {(() => {
                    const currentSelected = availableUsers.find((u) => u.id === selectedRecipientUserId);
                    const isSelf = selectedRecipientUserId === currentUser?.id;
                    return (
                      <div className="p-2.5 rounded-xl bg-white border-2 border-amber-300 flex items-center justify-between gap-3 shadow-2xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={
                              currentSelected?.avatar ||
                              'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
                            }
                            alt={currentSelected?.name || selectedRecipientUserId}
                            className="w-8 h-8 rounded-full object-cover border border-amber-300 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-stone-900 text-xs truncate">
                                {currentSelected?.name || selectedRecipientUserId}
                              </span>
                              {isSelf && (
                                <span className="text-[9.5px] font-black px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-900">
                                  👑 我自己
                                </span>
                              )}
                              <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded-md bg-stone-100 text-stone-600">
                                {currentSelected?.role === 'admin'
                                  ? '管理員'
                                  : currentSelected?.role === 'solver'
                                  ? '專家解答者'
                                  : '提問發案者'}
                              </span>
                            </div>
                            <div className="mt-0.5">
                              <CopyableUserId userId={selectedRecipientUserId} prefix="用戶ID: " />
                            </div>
                          </div>
                        </div>

                        <span className="text-[10.5px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 shrink-0 flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>已選定</span>
                        </span>
                      </div>
                    );
                  })()}

                  {/* 搜尋輸入框 */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={recipientSearchQuery}
                      onChange={(e) => setRecipientSearchQuery(e.target.value)}
                      placeholder="輸入用戶姓名或 ID 搜尋（如：林智遠、user-1、admin）..."
                      className="w-full pl-8 pr-7 py-2 rounded-xl border border-stone-300 text-xs bg-white text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    {recipientSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setRecipientSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* 搜尋結果列表 / 會員快速選擇 */}
                  <div className="max-h-40 overflow-y-auto space-y-1 pr-1 bg-white p-1.5 rounded-xl border border-stone-200">
                    {(() => {
                      const q = recipientSearchQuery.trim().toLowerCase();
                      const filtered = availableUsers.filter((u) => {
                        if (!q) return true;
                        return (
                          u.name.toLowerCase().includes(q) ||
                          u.id.toLowerCase().includes(q) ||
                          (u.email && u.email.toLowerCase().includes(q)) ||
                          (u.domain && u.domain.toLowerCase().includes(q)) ||
                          (u.role && u.role.toLowerCase().includes(q))
                        );
                      });

                      if (filtered.length === 0) {
                        return (
                          <div className="p-2.5 text-center text-stone-500 text-[11px] space-y-1.5">
                            <p>找不到符合「{recipientSearchQuery}」的會員</p>
                            {recipientSearchQuery.trim() && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedRecipientUserId(recipientSearchQuery.trim());
                                  setRecipientSearchQuery('');
                                }}
                                className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold text-[10.5px] cursor-pointer"
                              >
                                直接指定發送至此 ID：#{recipientSearchQuery.trim()}
                              </button>
                            )}
                          </div>
                        );
                      }

                      return filtered.map((u) => {
                        const isSelected = selectedRecipientUserId === u.id;
                        return (
                          <div
                            key={u.id}
                            onClick={() => {
                              setSelectedRecipientUserId(u.id);
                              setRecipientSearchQuery('');
                            }}
                            className={`w-full p-2 rounded-lg text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                              isSelected
                                ? 'bg-amber-100/70 border border-amber-300 font-bold'
                                : 'hover:bg-stone-50 border border-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <img
                                src={u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                                alt={u.name}
                                className="w-6 h-6 rounded-full object-cover shrink-0"
                              />
                              <div className="truncate min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-stone-900 truncate font-bold">{u.name}</span>
                                  <span className="text-[9.5px] text-stone-500">
                                    ({u.role === 'admin' ? '管理員' : u.role === 'solver' ? '專家' : '提問者'})
                                  </span>
                                </div>
                                <div className="mt-0.5">
                                  <CopyableUserId userId={u.id} prefix="ID: " />
                                </div>
                              </div>
                            </div>
                            {isSelected && (
                              <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              {/* 3. 全站廣播說明 (僅當選全站時顯示) */}
              {sendTargetType === 'broadcast' && (
                <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200 text-purple-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Megaphone className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <span>全站廣播發送說明</span>
                  </div>
                  <p className="text-[11px] text-purple-800 leading-relaxed">
                    此通知將同時推播給全站所有已註冊會員與訪客帳號，並即時出現在所有會員的通知中心。
                  </p>
                </div>
              )}

              {/* 4. 通知分類 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-800 block mb-1">通知分類</label>
                  <select
                    value={sendCategory}
                    onChange={(e) => setSendCategory(e.target.value as 'system' | 'personal')}
                    className="w-full p-2.5 rounded-xl border border-stone-300 text-xs bg-stone-50 focus:bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  >
                    <option value="personal">個人通知 (Personal)</option>
                    <option value="system">系統通知 (System)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-800 block mb-1">觸發依據</label>
                  <div className="p-2.5 rounded-xl bg-stone-100 border border-stone-200 text-stone-600 truncate font-mono text-[11px]">
                    {sendingRule.triggerCondition}
                  </div>
                </div>
              </div>

              {/* 5. 標題與文案 (可微調) */}
              <div>
                <label className="text-xs font-bold text-stone-800 block mb-1">
                  通知標題 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={sendCustomTitle}
                  onChange={(e) => setSendCustomTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 text-xs bg-stone-50 focus:bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-800 block mb-1">
                  通知文案內容 <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={sendCustomMessage}
                  onChange={(e) => setSendCustomMessage(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 text-xs bg-stone-50 focus:bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  required
                />
              </div>

              {/* 按鈕 */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsSendModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-bold cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-black shadow-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sendTargetType === 'broadcast' ? '確認全站廣播發送' : '確認發送給個人'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: 一鍵刪除全部通知確認彈窗 */}
      {isClearAllConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-stone-200 text-stone-900 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-stone-900">確認一鍵刪除全部通知？</h3>
                <span className="text-[11px] text-stone-500 font-bold">
                  清空全站所有歷史通知紀錄
                </span>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              此操作將徹底清空全站目前累積之所有通知紀錄（共 {(allNotifications || notifications).length} 則）。清除後所有會員與管理員的通知匣將全面重設，無法復原。
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setIsClearAllConfirmOpen(false)}
                className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-bold cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmClearAll}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-xs cursor-pointer active:scale-95"
              >
                確認全部刪除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


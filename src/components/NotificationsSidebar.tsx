import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import {
  X,
  Bell,
  Mail,
  Scale,
  CheckCircle2,
  ExternalLink,
  MessageSquare,
  Award,
  Wallet,
  Sparkles,
  Check,
  CheckCheck,
  Clock,
  ChevronRight,
  Inbox,
  Filter,
  Info,
  Crown,
  User,
  Megaphone,
  Smartphone,
  BellRing,
  Send,
} from 'lucide-react';
import { PwaNotificationService } from '../services/pwaNotificationService';
import { PushNotificationGuideModal } from './PushNotificationGuideModal';

interface NotificationsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenQuestion?: (questionId: string) => void;
  onOpenChat?: () => void;
  onNavigateToAbout?: () => void;
  onOpenAiCrm?: () => void;
}

const isModeOrEnvNotification = (title?: string, message?: string) => {
  const text = `${title || ''} ${message || ''}`;
  if (!text.trim()) return false;

  return (
    text.includes('無金流模式') ||
    text.includes('正式營運模式') ||
    text.includes('示範測試模式') ||
    text.includes('純淨營運模式') ||
    text.includes('示範測試') ||
    text.includes('純淨營運') ||
    text.includes('測試環境') ||
    text.includes('隱藏測試帳號') ||
    text.includes('顯示測試帳號') ||
    text.includes('環境設定') ||
    text.includes('模式設定') ||
    text.includes('假資料已清除') ||
    text.includes('模擬假資料') ||
    text.includes('展示問題') ||
    text.includes('模擬專家') ||
    text.includes('測試交易數據') ||
    text.includes('已切換至') ||
    text.includes('已啟用示範') ||
    text.includes('測試環境 (TEST)') ||
    text.includes('無金流模式 (FREE)') ||
    text.includes('正式營運模式 (NORM)') ||
    text.includes('競賽模式 (RACE)') ||
    (text.includes('模式') && (text.includes('啟用') || text.includes('切換') || text.includes('開啟') || text.includes('關閉') || text.includes('恢復') || text.includes('隱藏') || text.includes('純淨') || text.includes('示範') || text.includes('營運') || text.includes('測試'))) ||
    (text.includes('環境') && (text.includes('啟用') || text.includes('切換') || text.includes('開啟') || text.includes('關閉') || text.includes('恢復') || text.includes('測試')))
  );
};

export const NotificationsSidebar: React.FC<NotificationsSidebarProps> = ({
  isOpen,
  onClose,
  onOpenQuestion,
  onOpenChat,
  onNavigateToAbout,
  onOpenAiCrm,
}) => {
  const {
    currentUser,
    notifications,
    personalNotifications,
    systemNotifications,
    unreadPersonalCount,
    unreadSystemCount,
    hasUnreadSystemNotifs,
    markNotificationRead,
    markAllNotificationsRead,
    markAllPersonalNotificationsRead,
    markAllSystemNotificationsRead,
    questions,
    setSelectedQuestion,
    startDirectChat,
    availableUsers,
  } = useApp();

  const [categoryTab, setCategoryTab] = useState<'personal' | 'system'>('personal');
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread'>('all');
  const [pushPermission, setPushPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [isPushEnabled, setIsPushEnabled] = useState<boolean>(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState<boolean>(false);
  const [isTestSending, setIsTestSending] = useState(false);
  const [testSentMessage, setTestSentMessage] = useState<string | null>(null);

  const refreshPushStatus = () => {
    const perm = PwaNotificationService.getPermissionState();
    setPushPermission(perm);
    const enabled = PwaNotificationService.isPushEnabled();
    setIsPushEnabled(enabled);
  };

  useEffect(() => {
    if (isOpen) {
      refreshPushStatus();
    }
  }, [isOpen]);

  const handleTogglePush = async () => {
    // 1. 若目前已開啟 -> 點擊關閉
    if (isPushEnabled) {
      PwaNotificationService.setPushEnabled(false);
      setIsPushEnabled(false);
      setTestSentMessage('已關閉手機通知');
      setTimeout(() => setTestSentMessage(null), 3000);
      return;
    }

    // 2. 檢查當前環境
    const perm = PwaNotificationService.getPermissionState();
    const isIOS = PwaNotificationService.isIOS();
    const isStandalone = PwaNotificationService.isStandalone();

    // 環境條件 A：iOS 且未加入主畫面 -> 無法直接註冊推播，自動彈出專屬引導
    if (isIOS && !isStandalone) {
      setIsGuideModalOpen(true);
      return;
    }

    // 環境條件 B：已被瀏覽器或系統設為封鎖或不支援 -> 自動彈出步驟引導
    if (perm === 'denied' || perm === 'unsupported') {
      setIsGuideModalOpen(true);
      return;
    }

    // 環境條件 C：已經具有 granted 授權 -> 直接啟用
    if (perm === 'granted') {
      PwaNotificationService.setPushEnabled(true);
      setIsPushEnabled(true);
      setTestSentMessage('🎉 已成功開啟手機通知！');
      await PwaNotificationService.sendTestNotification();
      setTimeout(() => setTestSentMessage(null), 4000);
      return;
    }

    // 環境條件 D：尚未詢問過 (default) -> 觸發瀏覽器原生授權視窗
    try {
      const res = await PwaNotificationService.requestPermission();
      setPushPermission(res);
      if (res === 'granted') {
        PwaNotificationService.setPushEnabled(true);
        setIsPushEnabled(true);
        setTestSentMessage('🎉 已成功開啟手機通知！測試通知已發送至您的系統通知列');
        await PwaNotificationService.sendTestNotification();
        setTimeout(() => setTestSentMessage(null), 4000);
      } else {
        // 使用者點選封鎖或關閉 -> 自動引導用戶如何至設定開啟
        setIsGuideModalOpen(true);
      }
    } catch {
      setIsGuideModalOpen(true);
    }
  };

  const handleSendTestPush = async () => {
    setIsTestSending(true);
    const success = await PwaNotificationService.sendTestNotification();
    setIsTestSending(false);
    if (success) {
      setTestSentMessage('🔔 測試推播已發送！請檢視您的裝置通知中心或鎖定畫面');
    } else {
      setTestSentMessage('⚠️ 發送失敗，請確認是否已允許瀏覽器通知權限');
      setIsGuideModalOpen(true);
    }
    setTimeout(() => setTestSentMessage(null), 4500);
  };

  // 高亮突顯訊息中的用戶名（藍色字體）
  const highlightUserNames = (text: string) => {
    if (!text) return null;
    const knownNames = Array.from(
      new Set([
        '張先生',
        '陳副總',
        '林總監',
        '柯育任',
        '陳怡君',
        '林書豪',
        '王大明',
        '黃專員',
        '許顧問',
        '劉創辦人',
        ...(availableUsers || []).map((u) => u.name),
      ])
    ).filter(Boolean);

    if (knownNames.length === 0) return text;

    const pattern = new RegExp(`(${knownNames.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');
    const parts = text.split(pattern);

    if (parts.length === 1) return text;

    return parts.map((part, i) =>
      knownNames.includes(part) ? (
        <span key={i} className="text-blue-600 font-bold">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background scroll when sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const cleanPersonalNotifications = useMemo(() => {
    return personalNotifications.filter((n: any) => {
      if (isModeOrEnvNotification(n.title, n.message)) return false;
      if (n.userId && n.userId !== currentUser?.id && (n.userId === 'admin' ? currentUser?.role !== 'admin' : true)) {
        return false;
      }
      return true;
    });
  }, [personalNotifications, currentUser]);

  const cleanSystemNotifications = useMemo(() => {
    return systemNotifications.filter((n: any) => {
      if (isModeOrEnvNotification(n.title, n.message)) return false;
      if (n.userId && n.userId !== currentUser?.id && (n.userId === 'admin' ? currentUser?.role !== 'admin' : true)) {
        return false;
      }
      return true;
    });
  }, [systemNotifications, currentUser]);

  const cleanUnreadPersonalCount = useMemo(() => {
    return cleanPersonalNotifications.filter((n: any) => !n.read).length;
  }, [cleanPersonalNotifications]);

  const cleanUnreadSystemCount = useMemo(() => {
    return cleanSystemNotifications.filter((n: any) => !n.read).length;
  }, [cleanSystemNotifications]);

  const currentCategoryList = categoryTab === 'personal' ? cleanPersonalNotifications : cleanSystemNotifications;
  const currentUnreadCount = categoryTab === 'personal' ? cleanUnreadPersonalCount : cleanUnreadSystemCount;

  const filteredNotifications = useMemo(() => {
    return activeFilter === 'unread'
      ? currentCategoryList.filter((n: any) => !n.read)
      : currentCategoryList;
  }, [activeFilter, currentCategoryList]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div
          className="w-screen max-w-md sm:max-w-lg bg-white shadow-2xl border-l border-stone-200 flex flex-col justify-between overflow-hidden transform transition-all ease-in-out duration-300 translate-x-0"
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50/80">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  currentUser?.role === 'admin'
                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                    : 'bg-amber-500/10 border border-amber-200 text-amber-800'
                }`}
              >
                {currentUser?.role === 'admin' ? (
                  <Mail className="w-5 h-5" />
                ) : (
                  <Bell className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black text-stone-900 tracking-tight">
                    {currentUser?.role === 'admin' ? '管理員內部郵件與申訴中心' : '通知中心'}
                  </h2>
                  {cleanUnreadPersonalCount > 0 && (
                    <span className="text-xs bg-amber-500 text-stone-950 font-black px-2 py-0.5 rounded-full shadow-2xs">
                      {cleanUnreadPersonalCount} 則個人未讀
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-500">
                  {currentUser?.role === 'admin'
                    ? '即時掌握案件申訴調解、違規回報與平台官方郵件'
                    : '即時掌握個人提問解答、方案入帳、私聊進度與平台系統公告'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors cursor-pointer"
                aria-label="關閉通知側邊欄"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 開啟手機通知 開關 (現代滑動開關 Toggle Switch 與自動引導設定) */}
          <div className="px-4 sm:px-5 py-3 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-amber-500/10 border-b border-amber-200/70">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    isPushEnabled
                      ? 'bg-emerald-500/20 text-emerald-800 border border-emerald-300'
                      : pushPermission === 'denied'
                      ? 'bg-rose-500/15 text-rose-800 border border-rose-300'
                      : 'bg-amber-500/20 text-amber-900 border border-amber-300'
                  }`}
                >
                  <Smartphone className="w-4 h-4 text-amber-800" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-black text-stone-900 tracking-tight">
                      開啟手機通知
                    </span>
                    {isPushEnabled ? (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5">
                        <Check className="w-2.5 h-2.5 text-emerald-700" /> 已開啟
                      </span>
                    ) : pushPermission === 'denied' ? (
                      <button
                        type="button"
                        onClick={() => setIsGuideModalOpen(true)}
                        className="text-[10px] bg-rose-100 text-rose-800 font-bold px-1.5 py-0.5 rounded-full hover:bg-rose-200 transition-colors cursor-pointer"
                        title="點擊查看解除封鎖步驟"
                      >
                        已封鎖 (點此引導)
                      </button>
                    ) : null}
                  </div>
                  <p className="text-[11px] text-stone-600 mt-0.5 leading-tight truncate">
                    {isPushEnabled
                      ? '懸賞入帳、方案採納與私訊皆會跳出鎖定畫面橫幅'
                      : pushPermission === 'denied'
                      ? '瀏覽器已封鎖，點擊開關自動為您引導完成設定'
                      : '比照原生 App，隨時隨地在手機跳通知掌握最新動態'}
                  </p>
                </div>
              </div>

              {/* 右側：測試推播按鍵 + 現代滑動開關 (Toggle Switch) */}
              <div className="flex items-center gap-2 shrink-0">
                {isPushEnabled && (
                  <button
                    type="button"
                    onClick={handleSendTestPush}
                    disabled={isTestSending}
                    className="px-2 py-1 rounded-lg bg-white hover:bg-amber-100/70 border border-stone-200 hover:border-amber-300 text-stone-800 text-[11px] font-bold transition-all shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50 flex items-center gap-1"
                    title="在您的手機或電腦系統彈出一則測試推播通知"
                  >
                    <BellRing className="w-3 h-3 text-amber-600" />
                    <span className="hidden sm:inline">{isTestSending ? '發送中' : '測試'}</span>
                  </button>
                )}

                {/* 滑動開關本體 */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={isPushEnabled}
                  onClick={handleTogglePush}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none active:scale-95 ${
                    isPushEnabled ? 'bg-emerald-500' : 'bg-stone-300'
                  }`}
                  title={isPushEnabled ? '點擊關閉手機通知' : '點擊開啟手機通知'}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      isPushEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* 提示回饋 */}
            {testSentMessage && (
              <div className="mt-2 text-[11px] font-bold text-amber-950 bg-white/95 border border-amber-300/80 rounded-xl px-2.5 py-1 animate-in fade-in slide-in-from-top-1 duration-150 flex items-center gap-1.5 shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>{testSentMessage}</span>
              </div>
            )}
          </div>

          {/* 1. Category Switcher: 個人通知 vs 系統通知 (各有獨立未讀計數與一鍵已讀) */}
          <div className="px-4 sm:px-5 pt-3 pb-2 bg-stone-50/50 border-b border-stone-200/80">
            <div className="grid grid-cols-2 gap-2 p-1 bg-stone-200/60 rounded-2xl">
              {/* Tab 1: 個人通知 */}
              <button
                type="button"
                onClick={() => setCategoryTab('personal')}
                className={`py-2 px-2.5 sm:px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  categoryTab === 'personal'
                    ? 'bg-white text-stone-900 shadow-sm font-black'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-white/40'
                }`}
              >
                <User className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="whitespace-nowrap">個人通知</span>
                {cleanUnreadPersonalCount > 0 ? (
                  <span className="min-w-[18px] h-[18px] px-1 bg-amber-500 text-stone-950 font-mono font-black text-[10px] rounded-full flex items-center justify-center shadow-2xs shrink-0">
                    {cleanUnreadPersonalCount > 99 ? '99+' : cleanUnreadPersonalCount}
                  </span>
                ) : (
                  <span className="text-[10px] text-stone-400 font-mono shrink-0">
                    ({cleanPersonalNotifications.length})
                  </span>
                )}
              </button>

              {/* Tab 2: 系統通知 (僅顯示未讀數字) */}
              <button
                type="button"
                onClick={() => setCategoryTab('system')}
                className={`py-2 px-2.5 sm:px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  categoryTab === 'system'
                    ? 'bg-white text-stone-900 shadow-sm font-black'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-white/40'
                }`}
              >
                <Megaphone className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="whitespace-nowrap">系統通知</span>
                
                {cleanUnreadSystemCount > 0 ? (
                  <span className="min-w-[18px] h-[18px] px-1 bg-rose-500 text-white font-mono font-black text-[10px] rounded-full flex items-center justify-center shadow-2xs shrink-0">
                    {cleanUnreadSystemCount > 99 ? '99+' : cleanUnreadSystemCount}
                  </span>
                ) : (
                  <span className="text-[10px] text-stone-400 font-mono shrink-0">
                    ({cleanSystemNotifications.length})
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* 2. Sub-filter: 全部 vs 未讀 */}
          <div className="px-4 sm:px-5 py-2.5 border-b border-stone-100 bg-white flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeFilter === 'all'
                    ? 'bg-white text-stone-900 shadow-2xs font-black'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                全部 ({currentCategoryList.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('unread')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                  activeFilter === 'unread'
                    ? 'bg-white text-stone-900 shadow-2xs font-black'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                <span>未讀 ({currentUnreadCount})</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* 快捷一鍵已讀按鈕 (雙鉤圖示不用文字) */}
              {currentUnreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (categoryTab === 'personal') {
                      markAllPersonalNotificationsRead();
                    } else {
                      markAllSystemNotificationsRead();
                    }
                  }}
                  className={`p-1 rounded-md border transition-all cursor-pointer shadow-2xs active:scale-95 flex items-center justify-center ${
                    categoryTab === 'personal'
                      ? 'text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-200'
                      : 'text-blue-800 bg-blue-50 hover:bg-blue-100 border-blue-200'
                  }`}
                  title={`一鍵已讀當前${categoryTab === 'personal' ? '個人' : '系統'}所有未讀通知`}
                  aria-label={`一鍵已讀當前${categoryTab === 'personal' ? '個人' : '系統'}所有未讀通知`}
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                </button>
              )}
              <span className="text-[11px] text-stone-400 font-mono">
                顯示 {filteredNotifications.length} 則
              </span>
            </div>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5">
            {/* AI-CRM Real-time Follow-up Alert Card: 僅針對非管理員且在個人通知分頁展示 */}
            {currentUser?.role !== 'admin' && categoryTab === 'personal' && (
              <div
                onClick={() => {
                  if (onOpenAiCrm) {
                    onOpenAiCrm();
                  }
                  onClose();
                }}
                className="p-3.5 rounded-2xl bg-gradient-to-r from-stone-900 to-amber-950 text-white border border-amber-500/30 hover:border-amber-400/80 shadow-xs space-y-2.5 transition-all cursor-pointer group"
                title="點擊進入 AI-CRM 客戶關係管理頁面"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5 group-hover:text-amber-200 transition-colors">
                    <Crown className="w-3.5 h-3.5 fill-amber-400" />
                    <span>AI-CRM 商機追蹤推播</span>
                  </span>
                  <span className="text-[10px] font-mono bg-amber-400 text-stone-950 px-1.5 py-0.2 rounded font-black">
                    大師專屬
                  </span>
                </div>

                <p className="text-xs text-stone-200 leading-relaxed group-hover:text-white transition-colors">
                  「提問者<span className="text-blue-400 font-black">張先生</span> 3 天前檢視了您的提案尚未回覆，AI 建議發送補充資料；關注『跨境電商』主題看板新增 2 則高品質解題方案。」
                </p>

                {/* 卡片底部操作區：左側點擊提示，右下角直接連到該建議用戶的聊天室捷徑 */}
                <div className="flex items-center justify-between pt-1.5 border-t border-amber-500/20 text-[11px] gap-2">
                  <span className="text-amber-300/80 group-hover:text-amber-300 text-[10px] font-medium flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>點擊進入 AI-CRM 管理</span>
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const targetUser = {
                        id: 'user-zhang',
                        name: '張先生',
                        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
                        title: '連鎖餐飲品牌創辦人',
                      };
                      const targetQ = questions.find((q) => q.id === 'q-food-d2c');
                      startDirectChat(targetUser, targetQ);
                      if (onOpenChat) {
                        onOpenChat();
                      }
                      onClose();
                    }}
                    className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 active:scale-95 text-stone-950 font-black text-[11px] flex items-center gap-1.5 shadow-xs transition-all cursor-pointer shrink-0"
                    title="直接連到私聊聊天室"
                  >
                    <MessageSquare className="w-3 h-3 fill-stone-950" />
                    <span>前往此聊天室</span>
                  </button>
                </div>
              </div>
            )}

            {filteredNotifications.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-stone-400 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-400">
                  <Inbox className="w-7 h-7 stroke-[1.5]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-700">
                    目前沒有{activeFilter === 'unread' ? '未讀' : ''}{categoryTab === 'personal' ? '個人' : '系統'}通知
                  </h3>
                  <p className="text-xs text-stone-400 mt-1 max-w-xs">
                    {categoryTab === 'personal'
                      ? '當有專家回應您的提問、懸賞被採納或收到私聊訊息時，將第一時間通知您。'
                      : '平台公告、AI 智能媒合與系統升級資訊將在此發布。'}
                  </p>
                </div>
              </div>
            ) : (
              filteredNotifications.map((n: any) => {
                const isUnread = !n.read;
                const isSystem = n.category === 'system' || n.type === 'system' || n.type === 'ai_match';
                return (
                  <div
                    key={n.id}
                    onClick={() => {
                      markNotificationRead(n.id);
                      if (n.linkQuestionId) {
                        const found = questions.find((q) => q.id === n.linkQuestionId);
                        if (found) {
                          setSelectedQuestion(found);
                        }
                        if (onOpenQuestion) {
                          onOpenQuestion(n.linkQuestionId);
                        }
                        onClose();
                      } else if (n.title.includes('私聊') || n.message.includes('私聊') || n.title.includes('報價')) {
                        if (onOpenChat) {
                          onOpenChat();
                        }
                        onClose();
                      }
                    }}
                    className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer relative group ${
                      isUnread
                        ? isSystem
                          ? 'bg-blue-50/40 hover:bg-blue-50/60 border-blue-200 shadow-2xs ring-1 ring-blue-200/50'
                          : 'bg-amber-50/50 hover:bg-amber-50 border-amber-200 shadow-2xs ring-1 ring-amber-200/50'
                        : 'bg-white hover:bg-stone-50 border-stone-200/90 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {isUnread && (
                          <span className={`w-2 h-2 rounded-full shrink-0 ${isSystem ? 'bg-rose-500' : 'bg-amber-500'}`} />
                        )}
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          isSystem ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-900'
                        }`}>
                          {isSystem ? '系統' : '個人'}
                        </span>
                        <h4 className={`text-xs sm:text-sm font-bold ${
                          isUnread ? (isSystem ? 'text-blue-950 font-black' : 'text-amber-950 font-black') : 'text-stone-900'
                        }`}>
                          {highlightUserNames(n.title)}
                        </h4>
                      </div>
                      <span className="text-[10px] text-stone-400 shrink-0 font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{n.createdAt}</span>
                      </span>
                    </div>

                    <p className="text-xs text-stone-600 mt-1.5 leading-relaxed pl-0">
                      {highlightUserNames(n.message)}
                    </p>

                    <div className="mt-2.5 flex items-center justify-between text-[11px] font-semibold">
                      {n.linkQuestionId ? (
                        <span className="inline-flex items-center gap-1 text-amber-700 group-hover:text-amber-900 group-hover:underline">
                          <span>查看該提問詳情</span>
                          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-stone-500 font-bold">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>已讀</span>
                        </span>
                      )}

                      {isUnread ? (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          isSystem ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-amber-100/80 text-amber-700'
                        }`}>
                          未讀
                        </span>
                      ) : (
                        <span className="text-[10px] text-stone-500 font-bold bg-stone-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Check className="w-2.5 h-2.5 text-emerald-600" />
                          <span>已讀</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-3.5 sm:p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-stone-900 text-white hover:bg-stone-800 text-xs font-bold transition-colors cursor-pointer"
            >
              關閉
            </button>
          </div>
        </div>
      </div>

      {/* 手機通知引導設定彈窗 */}
      <PushNotificationGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => {
          setIsGuideModalOpen(false);
          refreshPushStatus();
        }}
        onPermissionChanged={(newPerm) => {
          setPushPermission(newPerm);
          if (newPerm === 'granted') {
            setIsPushEnabled(true);
            setTestSentMessage('🎉 已成功開啟手機通知！');
            setTimeout(() => setTestSentMessage(null), 4000);
          }
        }}
      />
    </div>,
    document.body
  );
};

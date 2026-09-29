import React, { useEffect, useState } from 'react';
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
  CheckCheck,
  Clock,
  ChevronRight,
  Inbox,
  Filter,
  Info,
  Crown,
} from 'lucide-react';

interface NotificationsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenQuestion?: (questionId: string) => void;
  onOpenChat?: () => void;
  onNavigateToAbout?: () => void;
  onOpenAiCrm?: () => void;
}

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
    markNotificationRead,
    markAllNotificationsRead,
    questions,
    setSelectedQuestion,
    startDirectChat,
  } = useApp();

  const [activeFilter, setActiveFilter] = useState<'all' | 'unread'>('all');

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

  const unreadCount = notifications.filter((n) => !n.read).length;
  const filteredNotifications = activeFilter === 'unread'
    ? notifications.filter((n) => !n.read)
    : notifications;

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
                  {unreadCount > 0 && (
                    <span className="text-xs bg-amber-500 text-stone-950 font-black px-2 py-0.5 rounded-full shadow-2xs">
                      {unreadCount} 未讀
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-500">
                  {currentUser?.role === 'admin'
                    ? '即時掌握案件申訴調解、違規回報與平台官方郵件'
                    : '即時掌握提問解答、懸賞入帳與私聊進度'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllNotificationsRead()}
                  className="px-2.5 py-1.5 text-xs font-bold text-stone-600 hover:text-amber-900 hover:bg-amber-50 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                  title="全部標為已讀"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-amber-600" />
                  <span className="hidden sm:inline">全部已讀</span>
                </button>
              )}
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

          {/* Filter Tabs */}
          <div className="px-4 sm:px-5 pt-3 pb-2 border-b border-stone-100 bg-white flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeFilter === 'all'
                    ? 'bg-white text-stone-900 shadow-2xs font-black'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {currentUser?.role === 'admin' ? `全部郵件 (${notifications.length})` : `全部通知 (${notifications.length})`}
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('unread')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  activeFilter === 'unread'
                    ? 'bg-white text-stone-900 shadow-2xs font-black'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <span>未讀</span>
                {unreadCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                )}
              </button>
            </div>

            <span className="text-[11px] text-stone-400 font-mono">
              共 {filteredNotifications.length} 則
            </span>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5">
            {/* AI-CRM Real-time Follow-up Alert Card: 僅針對非管理員（一般用戶/解答者）展示 */}
            {currentUser?.role !== 'admin' && (
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
                  「提問者張先生 3 天前檢視了您的提案尚未回覆，AI 建議發送補充資料；關注『跨境電商』主題看板新增 2 則高品質解題方案。」
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
                    title="直接連到張先生的私聊聊天室"
                  >
                    <MessageSquare className="w-3 h-3 fill-stone-950" />
                    <span>前往張先生聊天室</span>
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
                  <h3 className="text-sm font-bold text-stone-700">目前沒有{activeFilter === 'unread' ? '未讀' : ''}通知</h3>
                  <p className="text-xs text-stone-400 mt-1 max-w-xs">
                    當有解答專家回應您的提問、懸賞被採納或收到私聊訊息時，將第一時間通知您。
                  </p>
                </div>
              </div>
            ) : (
              filteredNotifications.map((n) => {
                const isUnread = !n.read;
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
                        ? 'bg-amber-50/50 hover:bg-amber-50 border-amber-200 shadow-2xs ring-1 ring-amber-200/50'
                        : 'bg-white hover:bg-stone-50 border-stone-200/90 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                        )}
                        <h4 className={`text-xs sm:text-sm font-bold ${isUnread ? 'text-amber-950 font-black' : 'text-stone-900'}`}>
                          {n.title}
                        </h4>
                      </div>
                      <span className="text-[10px] text-stone-400 shrink-0 font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{n.createdAt}</span>
                      </span>
                    </div>

                    <p className="text-xs text-stone-600 mt-1.5 leading-relaxed pl-0">
                      {n.message}
                    </p>

                    <div className="mt-2.5 flex items-center justify-between text-[11px] font-semibold">
                      {n.linkQuestionId ? (
                        <span className="inline-flex items-center gap-1 text-amber-700 group-hover:text-amber-900 group-hover:underline">
                          <span>查看該提問詳情</span>
                          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      ) : (
                        <span className="text-stone-400">點擊查看</span>
                      )}

                      {isUnread && (
                        <span className="text-[10px] text-amber-700 font-bold bg-amber-100/80 px-2 py-0.5 rounded-md">
                          未讀
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
    </div>,
    document.body
  );
};

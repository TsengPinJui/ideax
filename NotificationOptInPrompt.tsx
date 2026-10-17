import React, { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { PwaNotificationService } from '../services/pwaNotificationService';

/** 觸發方式：window.dispatchEvent(new CustomEvent(NOTIFICATION_OPT_IN_EVENT)) */
export const NOTIFICATION_OPT_IN_EVENT = 'ideax:suggest-notification-optin';

const DISMISSED_AT_KEY = 'ideax_notification_optin_dismissed_at';
const SNOOZE_DAYS = 14;

function shouldOffer(): boolean {
  if (!PwaNotificationService.isNotificationSupported()) return false;
  if (PwaNotificationService.getPermissionState() !== 'default') return false;
  if (PwaNotificationService.isInIframe()) return false;
  // iPhone / iPad 需先「加入主畫面」才能收到通知，未加入時不詢問，避免按了沒反應
  if (PwaNotificationService.isIOS() && !PwaNotificationService.isStandalone()) return false;
  try {
    const dismissedAt = Number(localStorage.getItem(DISMISSED_AT_KEY) || 0);
    if (dismissedAt && Date.now() - dismissedAt < SNOOZE_DAYS * 86400000) return false;
  } catch {}
  return true;
}

/**
 * 在使用者剛發布內容後，用站內小卡片詢問「有人回覆時要通知你嗎？」
 * 使用者按下「開啟通知」才叫出瀏覽器的權限視窗，避免一進站就被系統視窗打擾。
 */
export const NotificationOptInPrompt: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<'idle' | 'granted' | 'denied'>('idle');

  useEffect(() => {
    const handler = () => {
      if (shouldOffer()) {
        setStatus('idle');
        setVisible(true);
      }
    };
    window.addEventListener(NOTIFICATION_OPT_IN_EVENT, handler);
    return () => window.removeEventListener(NOTIFICATION_OPT_IN_EVENT, handler);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED_AT_KEY, String(Date.now()));
    } catch {}
    setVisible(false);
  };

  const enable = async () => {
    const result = await PwaNotificationService.requestPermission();
    if (result === 'granted') {
      setStatus('granted');
      setTimeout(() => setVisible(false), 1800);
    } else {
      setStatus('denied');
      try {
        localStorage.setItem(DISMISSED_AT_KEY, String(Date.now()));
      } catch {}
      setTimeout(() => setVisible(false), 2600);
    }
  };

  return (
    <div className="fixed z-[90] left-3 right-3 bottom-20 sm:left-auto sm:right-6 sm:bottom-6 sm:w-[360px] animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="rounded-2xl bg-white border border-amber-200 shadow-xl p-4 flex gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
          <Bell className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          {status === 'idle' && (
            <>
              <p className="text-sm font-black text-stone-900">有人回覆時，要通知你嗎？</p>
              <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">有新方案、留言或私訊時跳出提醒，隨時可在通知中心關閉。</p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={enable}
                  className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-xs font-black text-stone-950 cursor-pointer"
                >
                  開啟通知
                </button>
                <button
                  type="button"
                  onClick={dismiss}
                  className="px-3.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-xs font-bold text-stone-600 cursor-pointer"
                >
                  先不用
                </button>
              </div>
            </>
          )}
          {status === 'granted' && <p className="text-sm font-black text-emerald-700 pt-2">已開啟通知 🎉</p>}
          {status === 'denied' && (
            <p className="text-xs text-stone-600 pt-1 leading-relaxed">
              通知沒有開啟。之後想開啟，可以到瀏覽器的網站設定允許通知，再從通知中心測試。
            </p>
          )}
        </div>
        <button type="button" onClick={dismiss} className="self-start p-1 rounded-md hover:bg-stone-100 cursor-pointer" aria-label="關閉">
          <X className="w-4 h-4 text-stone-400" />
        </button>
      </div>
    </div>
  );
};

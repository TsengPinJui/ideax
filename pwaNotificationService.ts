/**
 * IdeaX 創點子 — PWA 原生推播與通知服務 (Web Push & Native Notifications)
 * 支援 Android、iOS 16.4+ (加入主畫面) 以及桌面端之原生系統通知與未讀數字徽章
 */

const STORAGE_KEY_PUSH_ENABLED = 'ideax_pwa_push_enabled';

export interface NativeNotificationOptions {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
  badge?: string;
  /** 同類通知的分組名稱（例如 'new_answer'），同組會合併成一則並顯示累計數量 */
  group?: string;
  /** 網頁正在前景使用中時是否仍顯示系統通知（預設不顯示，避免重複打擾） */
  showWhenFocused?: boolean;
}

// 同組通知在使用者回到網頁前的累計數（回到網頁即歸零）
const groupCounts = new Map<string, number>();
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') groupCounts.clear();
  });
}

const GROUP_LABELS: Record<string, string> = {
  new_answer: '則新方案',
  new_discussion: '則新留言',
  chat_message: '則新私訊',
  handshake: '則媒合邀請',
  ai_match: '則推薦媒合',
  payment_unlocked: '筆解鎖付款',
  solution_accepted: '則方案被採納',
};

export class PwaNotificationService {
  /**
   * 檢查當前裝置與瀏覽器是否支援 Notifications API
   */
  public static isNotificationSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  /**
   * 檢查當前裝置是否支援 Service Worker
   */
  public static isServiceWorkerSupported(): boolean {
    return typeof window !== 'undefined' && 'serviceWorker' in navigator;
  }

  /**
   * 偵測是否為 iOS 裝置 (iPhone / iPad)
   */
  public static isIOS(): boolean {
    if (typeof window === 'undefined') return false;
    const ua = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(ua) && !(window as any).MSStream;
  }

  /**
   * 偵測當前是否處於 PWA 獨立運行模式 (Standalone / 已加入主畫面)
   */
  public static isStandalone(): boolean {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    );
  }

  /**
   * 偵測當前是否處於 iFrame 框架內（例如預覽環境或第三方內嵌）
   */
  public static isInIframe(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  }

  /**
   * 取得當前通知權限狀態
   */
  public static getPermissionState(): NotificationPermission | 'unsupported' {
    if (!this.isNotificationSupported()) {
      return 'unsupported';
    }
    return Notification.permission;
  }

  /**
   * 檢查使用者是否在平台內啟用推播通知設定
   */
  public static isPushEnabled(): boolean {
    if (!this.isNotificationSupported()) return false;
    if (Notification.permission !== 'granted') return false;

    const stored = localStorage.getItem(STORAGE_KEY_PUSH_ENABLED);
    // 預設只要權限已被允許，就啟用推播
    return stored === null ? true : stored === 'true';
  }

  /**
   * 設定平台內推播開關狀態
   */
  public static setPushEnabled(enabled: boolean): void {
    localStorage.setItem(STORAGE_KEY_PUSH_ENABLED, enabled ? 'true' : 'false');
  }

  /**
   * 主動請求瀏覽器與系統原生通知授權（標準呼叫）
   */
  public static async requestPermission(): Promise<NotificationPermission | 'unsupported'> {
    if (!this.isNotificationSupported()) {
      return 'unsupported';
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        this.setPushEnabled(true);
      }
      return permission;
    } catch (error) {
      console.warn('Notification permission request error:', error);
      return Notification.permission;
    }
  }

  /**
   * 直接叫出瀏覽器授權視窗，並附帶環境與錯誤狀態診斷
   */
  public static async requestPermissionDirect(): Promise<{
    permission: NotificationPermission | 'unsupported';
    inIframe: boolean;
    wasDeniedBefore: boolean;
    error?: string;
  }> {
    if (!this.isNotificationSupported()) {
      return {
        permission: 'unsupported',
        inIframe: this.isInIframe(),
        wasDeniedBefore: false,
      };
    }

    const inIframe = this.isInIframe();
    const wasDeniedBefore = Notification.permission === 'denied';

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        this.setPushEnabled(true);
      }
      return {
        permission,
        inIframe,
        wasDeniedBefore,
      };
    } catch (error: any) {
      console.warn('Direct notification request error:', error);
      return {
        permission: Notification.permission,
        inIframe,
        wasDeniedBefore,
        error: error?.message || String(error),
      };
    }
  }

  /**
   * 發送系統級原生推播通知 (優先調用 ServiceWorker.showNotification，次選 new Notification)
   */
  public static async sendNativeNotification(options: NativeNotificationOptions): Promise<boolean> {
    if (!this.isNotificationSupported()) return false;
    if (Notification.permission !== 'granted') return false;
    if (!this.isPushEnabled()) return false;

    // 使用者正在看網頁時不跳系統通知（站內通知欄已經會顯示），避免重複打擾
    if (
      !options.showWhenFocused &&
      typeof document !== 'undefined' &&
      document.visibilityState === 'visible' &&
      document.hasFocus()
    ) {
      return false;
    }

    let title = options.title || 'IdeaX 創點子';
    let body = options.body || '';
    const url = options.url || '/';
    const icon = options.icon || '/pwa-192x192.png';
    const badge = options.badge || '/favicon-32x32.png';
    const tag = options.tag || (options.group ? `ideax-${options.group}` : `ideax-${Date.now()}`);

    // 同組通知合併：第二則起改為「你有 N 則新留言」，並沿用同一個 tag 取代舊通知
    if (options.group) {
      const count = (groupCounts.get(options.group) || 0) + 1;
      groupCounts.set(options.group, count);
      if (count > 1) {
        const unit = GROUP_LABELS[options.group] || '則新通知';
        body = `最新：${title}${body ? `｜${body}` : ''}`;
        title = `IdeaX 創點子：你有 ${count} ${unit}`;
      }
    }

    // 優先使用 Service Worker 的 showNotification（在手機與背景 PWA 更穩定）
    if (this.isServiceWorkerSupported()) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration && registration.showNotification) {
          await registration.showNotification(title, {
            body,
            icon,
            badge,
            tag,
            data: { url, timestamp: Date.now() },
            // @ts-ignore - vibrate supported in modern mobile browsers
            vibrate: [150, 80, 150],
            renotify: true,
          });
          return true;
        }
      } catch (swErr) {
        console.warn('Service worker showNotification notice, falling back:', swErr);
      }
    }

    // 次選方案：使用常規 Notification 建構式
    try {
      const notif = new Notification(title, {
        body,
        icon,
        badge,
        tag,
        data: { url },
      });

      notif.onclick = () => {
        window.focus();
        // 直接開啟相關頁面（例如 /?q=問題ID 或 /chat）
        if (url && url !== '/') {
          window.location.href = url;
        }
        notif.close();
      };
      return true;
    } catch (notifErr) {
      console.warn('Native notification fallback failed:', notifErr);
      return false;
    }
  }

  /**
   * 發送一則測試通知
   */
  public static async sendTestNotification(): Promise<boolean> {
    const success = await this.sendNativeNotification({
      title: '🎉 IdeaX 創點子 — 手機原生通知測試',
      body: '恭喜！您的裝置已成功開啟原生推播通知。未來有新懸賞題目、方案採納或私聊互動將即時收到提醒！',
      url: '/',
      tag: 'ideax-test-notification',
      showWhenFocused: true,
    });
    return success;
  }

  /**
   * 更新手機 App 圖標上的未讀紅點數字 (App Badging API)
   */
  public static updateAppBadge(count: number): void {
    if (typeof navigator === 'undefined') return;

    try {
      if ('setAppBadge' in navigator && typeof (navigator as any).setAppBadge === 'function') {
        if (count > 0) {
          (navigator as any).setAppBadge(count).catch(() => {});
        } else {
          (navigator as any).clearAppBadge().catch(() => {});
        }
      }
    } catch (e) {
      // Badging API not supported or silently ignore
    }
  }
}

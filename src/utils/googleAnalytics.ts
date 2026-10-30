/**
 * Google Analytics (gtag.js: G-4VJ5394Y8K) 追蹤模組
 * 支援 SPA 虛擬頁面瀏覽 (trackPageView) 與自定義事件追蹤 (trackEvent)
 */

export const GA_MEASUREMENT_ID = 'G-4VJ5394Y8K';

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

export function trackPageView(pagePath: string, pageTitle?: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', {
        page_path: pagePath,
        page_title: pageTitle || document.title,
        page_location: window.location.href,
        send_to: GA_MEASUREMENT_ID,
      });
    }
  } catch {
    // 忽略廣告阻擋器或離線環境錯誤
  }
}

export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean | undefined>
): void {
  if (typeof window === 'undefined') return;
  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, {
        ...params,
        send_to: GA_MEASUREMENT_ID,
      });
    }
  } catch {
    // 忽略錯誤
  }
}

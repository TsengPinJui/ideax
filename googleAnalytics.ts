/**
 * Google Analytics (gtag.js) 整合模組
 * 評估追蹤 ID: G-4VJ5394Y8K
 */

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
  }
}

export const GA_TRACKING_ID = 'G-4VJ5394Y8K';

/**
 * 發送 SPA 虛擬頁面瀏覽事件 (Virtual Pageview)
 * @param pagePath 頁面路徑 (例：'/?zone=vibecoding' 或 '/question/123')
 * @param pageTitle 頁面標題
 */
export function trackPageView(pagePath: string, pageTitle?: string) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    try {
      window.gtag('event', 'page_view', {
        page_path: pagePath,
        page_title: pageTitle || document.title,
        page_location: window.location.href,
        send_to: GA_TRACKING_ID,
      });
    } catch (e) {
      console.warn('GA trackPageView warning:', e);
    }
  }
}

/**
 * 發送 Google Analytics 自定義事件 (Custom Event)
 * @param action 事件名稱 (例：'switch_special_zone', 'open_proposal')
 * @param params 事件參數
 */
export function trackEvent(action: string, params?: Record<string, any>) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    try {
      window.gtag('event', action, {
        ...params,
        send_to: GA_TRACKING_ID,
      });
    } catch (e) {
      console.warn('GA trackEvent warning:', e);
    }
  }
}

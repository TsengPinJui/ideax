/**
 * 原生分享與網址複製工具函數
 * 支援：
 * 1. 分享出去：帶有豐富文字說明與推薦引言（透過系統 Web Share API 直通 LINE, FB, IG, Threads, X, Email 等）
 * 2. 複製連結：100% 純淨單獨網址（絕不夾帶任何標題或文案，保護剪貼簿乾淨俐落）
 */

export interface ShareDataPayload {
  title: string;
  text?: string;
  url: string;
}

/**
 * 專門複製「純網址」至剪貼簿（保證不含任何標題或文字說明）
 */
export async function copyPureUrl(url: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch {
      // 降級處理
    }
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = url;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '0';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return !!success;
  } catch {
    return false;
  }
}

/**
 * 分享內容（智慧分流）：
 * - 原生分享面板（手機）：傳入 title + text（文字說明）+ url，分享至 LINE / 社群時自帶吸睛文案。
 * - 降級複製（電腦端或不支援 Web Share 時）：一律只複製純網址 url，絕不把文字塞進剪貼簿。
 */
export async function shareOrCopyUrl(payload: ShareDataPayload): Promise<'shared' | 'copied' | 'failed'> {
  const { title, text, url } = payload;

  // 1. 優先使用原生 Web Share API（手機/支援瀏覽器呼叫系統原生分享面板，直通 LINE、FB、IG、Threads 等，帶文字說明）
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      const shareData: ShareData = { url };
      if (text) {
        shareData.text = text;
      }
      if (title) {
        shareData.title = title;
      }

      await navigator.share(shareData);
      return 'shared';
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        // 用戶主動取消原生分享面板
        return 'shared';
      }
      // 其他異常降級至純網址複製
    }
  }

  // 2. 降級至剪貼簿直接複製：依需求「複製連結不含文字」，一律只寫入乾淨純網址 url
  const copied = await copyPureUrl(url);
  return copied ? 'copied' : 'failed';
}

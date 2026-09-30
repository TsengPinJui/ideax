/**
 * IdeaX PWA & Web App 直接下載與安裝中樞
 */

export function downloadAppLauncherFile() {
  try {
    const origin = window.location.origin;
    const isWindows = navigator.userAgent.includes('Windows');

    if (isWindows) {
      // 產生標準 Windows / 桌面 .url 捷徑檔
      const urlFileContent = `[InternetShortcut]\nURL=${origin}/\nIconIndex=0\nIconFile=${origin}/favicon.ico\n`;
      const blob = new Blob([urlFileContent], { type: 'application/octet-stream' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'IdeaX創點子.url';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } else {
      // 產生通用 HTML App 捷徑啟動包
      const htmlContent = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IdeaX創點子</title>
  <link rel="icon" href="${origin}/favicon.ico">
  <link rel="apple-touch-icon" href="${origin}/apple-touch-icon.png">
  <link rel="manifest" href="${origin}/manifest.json">
  <meta name="apple-mobile-web-app-title" content="IdeaX創點子">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="mobile-web-app-capable" content="yes">
  <meta http-equiv="refresh" content="0; url=${origin}/">
  <script>
    window.location.replace("${origin}/");
  </script>
</head>
<body style="margin:0; background:#f59e0b; color:#fff; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; font-family:sans-serif;">
  <img src="${origin}/pwa-192x192.png" style="width:96px;height:96px;border-radius:20px;box-shadow:0 8px 24px rgba(0,0,0,0.15);" alt="IdeaX創點子">
  <p style="margin-top:16px;font-weight:bold;font-size:16px;color:#18181b;">正在啟動 IdeaX創點子...</p>
  <a href="${origin}/" style="color:#78350f; text-decoration:underline; font-size:13px; margin-top:8px;">點此直接進入平台</a>
</body>
</html>`;
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'IdeaX創點子.html';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    }
    return true;
  } catch (err) {
    console.error('Download app launcher error:', err);
    return false;
  }
}

/**
 * 觸發直接下載 App 或喚起原生 PWA 安裝
 * 優先順序：直接呼叫瀏覽器原生安裝對話框（Chrome / Edge / Android）-> 若不支援則開啟操作指引彈窗
 */
export async function triggerDirectAppDownloadOrInstall(onOpenModal?: () => void) {
  const win = window as any;
  const promptObj = win.deferredPwaPrompt;

  // 1. 優先直接呼叫瀏覽器原生安裝對話框
  if (promptObj) {
    try {
      await promptObj.prompt();
      const { outcome } = await promptObj.userChoice;
      win.deferredPwaPrompt = null; // 該次 prompt 已使用完畢
      if (outcome === 'accepted') {
        try {
          localStorage.setItem('ideax_pwa_downloaded', 'true');
        } catch {}
        return 'installed';
      }
      return 'dismissed';
    } catch (e) {
      console.warn('Native browser prompt execution error:', e);
    }
  }

  // 2. 若瀏覽器尚未觸發或原生不支援（如 iOS Safari 或不具備 prompt 之環境），開啟指引彈窗協助用戶安裝
  if (onOpenModal) {
    onOpenModal();
    return 'guide_opened';
  }

  // 3. 在電腦桌面且無彈窗 callback 時，提供捷徑啟動檔下載
  downloadAppLauncherFile();
  return 'downloaded';
}

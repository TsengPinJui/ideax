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
      // 產生全平台通用 HTML App 捷徑啟動包 (內建全螢幕重定向與 PWA 標籤)
      const htmlContent = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IdeaX 創點子 App</title>
  <link rel="icon" href="${origin}/favicon.ico">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="mobile-web-app-capable" content="yes">
  <meta http-equiv="refresh" content="0; url=${origin}/">
  <script>
    window.location.href = "${origin}/";
  </script>
</head>
<body style="margin:0; background:#18181b; color:#fff; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; font-family:sans-serif;">
  <p>正在啟動 IdeaX 創點子 App...</p>
  <a href="${origin}/" style="color:#f59e0b; text-decoration:underline;">點此直接進入平台</a>
</body>
</html>`;
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'IdeaX-創點子-App.html';
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
 */
export async function triggerDirectAppDownloadOrInstall(onOpenModal?: () => void) {
  const win = window as any;
  const promptObj = win.deferredPwaPrompt;

  // 1. 若有原生 PWA 支援，優先觸發原生瀏覽器安裝對話框
  if (promptObj) {
    try {
      promptObj.prompt();
      const { outcome } = await promptObj.userChoice;
      if (outcome === 'accepted') {
        try {
          localStorage.setItem('ideax_pwa_downloaded', 'true');
        } catch {}
        return 'installed';
      }
    } catch (e) {
      console.warn('Native prompt failed, falling back to download & guide:', e);
    }
  }

  // 2. 直接發起下載桌面/手機通用啟動捷徑檔
  downloadAppLauncherFile();

  // 3. 開啟安裝彈窗提供進階指引
  if (onOpenModal) {
    onOpenModal();
  }

  return 'downloaded';
}

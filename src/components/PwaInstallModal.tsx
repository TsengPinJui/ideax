import React, { useState, useEffect } from 'react';
import {
  X,
  Smartphone,
  Download,
  CheckCircle2,
  Share,
  PlusSquare,
  MoreVertical,
  Laptop,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { IdeaXLogo } from './IdeaXLogo';
import { downloadAppLauncherFile } from '../services/pwaInstaller';

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PwaInstallModal: React.FC<PwaInstallModalProps> = ({ isOpen, onClose }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [isInstalling, setIsInstalling] = useState<boolean>(false);
  const [installSuccess, setInstallSuccess] = useState<boolean>(false);

  // 偵測系統環境 (iOS, Android, Desktop)
  const [deviceType, setDeviceType] = useState<'ios' | 'android' | 'desktop'>('desktop');

  useEffect(() => {
    // 判斷裝置
    const ua = navigator.userAgent || '';
    if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) {
      setDeviceType('ios');
    } else if (/android/i.test(ua)) {
      setDeviceType('android');
    } else {
      setDeviceType('desktop');
    }

    // 取得全域儲存之 deferredPwaPrompt
    const win = window as any;
    if (win.deferredPwaPrompt) {
      setDeferredPrompt(win.deferredPwaPrompt);
    }

    const handlePrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      win.deferredPwaPrompt = e;
    };

    const handlePromptReady = () => {
      if (win.deferredPwaPrompt) {
        setDeferredPrompt(win.deferredPwaPrompt);
      }
    };

    window.addEventListener('beforeinstallprompt', handlePrompt);
    window.addEventListener('pwa-prompt-ready', handlePromptReady);
    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt);
      window.removeEventListener('pwa-prompt-ready', handlePromptReady);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNativeInstall = async () => {
    const win = window as any;
    const promptObj = deferredPrompt || win.deferredPwaPrompt;

    if (promptObj) {
      try {
        setIsInstalling(true);
        await promptObj.prompt();
        const { outcome } = await promptObj.userChoice;
        if (outcome === 'accepted') {
          setInstallSuccess(true);
          try {
            localStorage.setItem('ideax_pwa_downloaded', 'true');
          } catch {}
          setTimeout(() => {
            onClose();
            setInstallSuccess(false);
          }, 1500);
        }
        win.deferredPwaPrompt = null;
        setDeferredPrompt(null);
      } catch (err) {
        console.error('PWA Native Install Error:', err);
      } finally {
        setIsInstalling(false);
      }
    } else {
      // 複製連結或提供指引
      handleCopyLink();
    }
  };

  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(window.location.origin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden space-y-0 text-stone-800 animate-in zoom-in-95 duration-200">
        
        {/* Header Header Pattern */}
        <div className="bg-gradient-to-br from-stone-900 via-stone-950 to-purple-950 p-6 text-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white transition-colors cursor-pointer"
            title="關閉"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 rounded-xl overflow-hidden border border-amber-400/40 bg-white/95 p-0.5 flex items-center justify-center shrink-0 shadow-sm">
              <img
                src="/pwa-192x192.png?v=pwa-app-15"
                alt="IdeaX創點子"
                className="w-full h-full object-contain rounded-lg"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <IdeaXLogo variant="ideax-6" size="sm" theme="dark" />
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  PWA 應用程式
                </span>
              </div>
              <p className="text-xs text-stone-300 font-bold mt-0.5">高價值問題與解決方案交易市場</p>
            </div>
          </div>

          <h3 className="text-lg font-black text-white">安裝 IdeaX創點子 App 到主畫面</h3>
          <p className="text-xs text-stone-300/90 leading-relaxed mt-1">
            享受獨立全螢幕視窗、秒速開啟、無廣告列干擾的原生 App 體驗！
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          
          {/* 原生觸發安裝按鈕 (若支援及觸發) */}
          {deferredPrompt ? (
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleNativeInstall}
                disabled={isInstalling}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:scale-98 text-stone-950 font-black rounded-2xl shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 text-sm transition-all cursor-pointer"
              >
                {installSuccess ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-stone-950 animate-bounce" />
                    <span>已成功加入安裝！</span>
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5 text-stone-950" />
                    <span>一鍵新增安裝 IdeaX創點子 App</span>
                  </>
                )}
              </button>
              <p className="text-[11px] text-center text-stone-500 font-medium">
                點擊按鈕即可自動喚起系統安裝確認彈窗
              </p>
            </div>
          ) : (
            /* 若無原生 prompt，顯示視覺引導指示 */
            <div className="space-y-4">
              
              {/* Tab Selector for Device */}
              <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-2xl text-xs font-bold text-stone-600">
                <button
                  type="button"
                  onClick={() => setDeviceType('android')}
                  className={`flex-1 py-1.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    deviceType === 'android' ? 'bg-white text-stone-950 shadow-xs font-black' : 'hover:text-stone-900'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Android 手機</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeviceType('ios')}
                  className={`flex-1 py-1.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    deviceType === 'ios' ? 'bg-white text-stone-950 shadow-xs font-black' : 'hover:text-stone-900'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                  <span>iPhone / iPad</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeviceType('desktop')}
                  className={`flex-1 py-1.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    deviceType === 'desktop' ? 'bg-white text-stone-950 shadow-xs font-black' : 'hover:text-stone-900'
                  }`}
                >
                  <Laptop className="w-3.5 h-3.5 text-purple-600" />
                  <span>電腦 / 電腦版</span>
                </button>
              </div>

              {/* Android 指示 */}
              {deviceType === 'android' && (
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/90 text-stone-800 text-xs space-y-2.5">
                  <div className="flex items-center gap-2 font-black text-amber-950 text-sm border-b border-amber-200/80 pb-2">
                    <MoreVertical className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Android Chrome / Edge 安裝步驟：</span>
                  </div>
                  <ol className="space-y-2 font-medium text-stone-700 leading-relaxed list-decimal list-inside">
                    <li>
                      點擊瀏覽器右上方選單圖示 <strong className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-200/80 text-stone-950"><MoreVertical className="w-3 h-3" /> 選單 (三點)</strong>。
                    </li>
                    <li>
                      選擇 <strong className="text-amber-950 bg-amber-200/80 px-1.5 py-0.5 rounded font-black">「安裝應用程式」</strong> 或 <strong className="text-amber-950 bg-amber-200/80 px-1.5 py-0.5 rounded font-black">「新增至主畫面」</strong>。
                    </li>
                    <li>點擊確認即可在手機桌面建立獨立 IdeaX創點子 App 圖示！</li>
                  </ol>
                </div>
              )}

              {/* iOS 指示 */}
              {deviceType === 'ios' && (
                <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/90 text-stone-800 text-xs space-y-2.5">
                  <div className="flex items-center gap-2 font-black text-blue-950 text-sm border-b border-blue-200/80 pb-2">
                    <Share className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>iPhone / iPad Safari 安裝步驟：</span>
                  </div>
                  <ol className="space-y-2 font-medium text-stone-700 leading-relaxed list-decimal list-inside">
                    <li>
                      點擊 Safari 瀏覽器底部的 <strong className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-200/80 text-stone-950"><Share className="w-3.5 h-3.5 text-blue-700" /> 分享按鈕</strong>。
                    </li>
                    <li>
                      在選單中向下滑動，選擇 <strong className="text-blue-950 bg-blue-200/80 px-1.5 py-0.5 rounded font-black inline-flex items-center gap-0.5"><PlusSquare className="w-3.5 h-3.5 text-blue-700" /> 加入主畫面</strong>。
                    </li>
                    <li>點擊右上角「新增」，即可從手機桌面一鍵啟動 IdeaX創點子 App！</li>
                  </ol>
                </div>
              )}

              {/* Desktop 指示 */}
              {deviceType === 'desktop' && (
                <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200/90 text-stone-800 text-xs space-y-2.5">
                  <div className="flex items-center gap-2 font-black text-purple-950 text-sm border-b border-purple-200/80 pb-2">
                    <Laptop className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>電腦版 Chrome / Edge 安裝步驟：</span>
                  </div>
                  <ol className="space-y-2 font-medium text-stone-700 leading-relaxed list-decimal list-inside">
                    <li>
                      點擊網址列右側出現的 <strong className="text-purple-950 bg-purple-200/80 px-1.5 py-0.5 rounded font-black">⊕ 安裝圖示</strong> 或右上角選單 <strong className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-purple-200/80 text-stone-950"><MoreVertical className="w-3 h-3" /> 選單</strong>。
                    </li>
                    <li>
                      點擊 <strong className="text-purple-950 bg-purple-200/80 px-1.5 py-0.5 rounded font-black">「安裝 IdeaX創點子...」</strong>。
                    </li>
                    <li>安裝後即可直接從電腦桌面或工作列獨立視窗啟動！</li>
                  </ol>
                </div>
              )}

              {/* 直接下載捷徑檔按鈕 */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    downloadAppLauncherFile();
                    setInstallSuccess(true);
                    setTimeout(() => setInstallSuccess(false), 3000);
                  }}
                  className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:scale-98 text-stone-950 font-black rounded-2xl shadow-md flex items-center justify-center gap-2 text-xs transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4 text-stone-950" />
                  <span>{installSuccess ? '✅ App 啟動檔已成功下載！' : '📥 一鍵直接下載 App 啟動捷徑檔'}</span>
                </button>
                <p className="text-[10px] text-center text-stone-400 mt-1">
                  支援全平台：下載後雙擊即可秒速全螢幕啟動 IdeaX創點子 App
                </p>
              </div>

            </div>
          )}

          {/* 網址與輔助工具 */}
          <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex-1 py-2 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">已複製網站網址</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-stone-500" />
                  <span>複製網站網址</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-900 active:scale-95 text-white font-bold text-xs transition-all cursor-pointer"
            >
              我知道了
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};

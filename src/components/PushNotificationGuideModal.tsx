import React, { useState, useEffect } from 'react';
import {
  X,
  Bell,
  Smartphone,
  AlertCircle,
  CheckCircle2,
  Share,
  Settings,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Copy,
  Check,
  Globe,
  Sliders,
  Sparkles,
  HelpCircle,
  Lock,
  MousePointerClick,
  Layers,
} from 'lucide-react';
import { PwaNotificationService } from '../services/pwaNotificationService';

interface PushNotificationGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPermissionChanged?: (permission: NotificationPermission | 'unsupported') => void;
  initialReason?: 'denied' | 'iframe' | 'ios' | 'default' | null;
}

export const PushNotificationGuideModal: React.FC<PushNotificationGuideModalProps> = ({
  isOpen,
  onClose,
  onPermissionChanged,
  initialReason,
}) => {
  const [deviceType, setDeviceType] = useState<'ios' | 'android' | 'desktop'>('android');
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [directCallStatus, setDirectCallStatus] = useState<
    'idle' | 'calling' | 'success' | 'blocked' | 'in_iframe'
  >('idle');
  const [isFaqOpen, setIsFaqOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setDirectCallStatus('idle');
      return;
    }

    const ua = navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua) && !(window as any).MSStream;
    const isAndroidDevice = /android/.test(ua);
    const standalone = PwaNotificationService.isStandalone();
    const inIframe = PwaNotificationService.isInIframe();

    setIsStandalone(standalone);
    setIsInIframe(inIframe);
    setPermission(PwaNotificationService.getPermissionState());

    if (inIframe) {
      setDirectCallStatus('in_iframe');
    } else if (initialReason === 'denied' || PwaNotificationService.getPermissionState() === 'denied') {
      setDirectCallStatus('blocked');
    }

    if (isIOSDevice) {
      setDeviceType('ios');
    } else if (isAndroidDevice) {
      setDeviceType('android');
    } else {
      setDeviceType('desktop');
    }
  }, [isOpen, initialReason]);

  if (!isOpen) return null;

  // 嘗試直接呼叫瀏覽器原生授權視窗
  const handleDirectCallPrompt = async () => {
    setDirectCallStatus('calling');
    const result = await PwaNotificationService.requestPermissionDirect();
    setPermission(result.permission);

    if (result.permission === 'granted') {
      setDirectCallStatus('success');
      PwaNotificationService.setPushEnabled(true);
      await PwaNotificationService.sendTestNotification();
      if (onPermissionChanged) onPermissionChanged('granted');
      setTimeout(() => {
        onClose();
      }, 1000);
      return;
    }

    if (result.inIframe) {
      setDirectCallStatus('in_iframe');
    } else if (result.wasDeniedBefore || result.permission === 'denied') {
      setDirectCallStatus('blocked');
    } else {
      setDirectCallStatus('blocked');
    }
  };

  const handleCheckAgain = async () => {
    setIsChecking(true);
    const current = PwaNotificationService.getPermissionState();
    setPermission(current);

    if (current === 'granted') {
      PwaNotificationService.setPushEnabled(true);
      await PwaNotificationService.sendTestNotification();
      if (onPermissionChanged) onPermissionChanged('granted');
      setTimeout(() => {
        setIsChecking(false);
        onClose();
      }, 800);
      return;
    }

    if (current === 'default') {
      const res = await PwaNotificationService.requestPermission();
      setPermission(res);
      if (res === 'granted') {
        PwaNotificationService.setPushEnabled(true);
        await PwaNotificationService.sendTestNotification();
        if (onPermissionChanged) onPermissionChanged('granted');
        setTimeout(() => {
          setIsChecking(false);
          onClose();
        }, 800);
        return;
      }
    }

    setTimeout(() => {
      setIsChecking(false);
    }, 600);
  };

  const handleCopyUrl = () => {
    try {
      navigator.clipboard.writeText(window.location.href);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-stone-950 flex items-start justify-between relative">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center border border-white/30 text-stone-950 shadow-sm shrink-0">
              <Bell className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">開啟手機通知設定引導</h3>
                <span className="text-[10px] bg-stone-950/20 text-stone-950 font-bold px-2 py-0.5 rounded-full">
                  PWA 原生推播
                </span>
              </div>
              <p className="text-xs text-stone-900/90 font-bold mt-0.5">
                懸賞入帳、專家方案被採納、私聊消息立即跳出鎖定畫面
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-stone-950/10 text-stone-950 transition-colors cursor-pointer"
            aria-label="關閉"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 快速核心操作卡片：立即呼叫原生視窗 / 解釋為何未跳出 */}
        <div className="p-4 bg-gradient-to-b from-amber-50 to-orange-50/40 border-b border-amber-200/80 space-y-2.5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="text-xs font-black text-stone-900">
                  可以直接叫出瀏覽器「允許通知」視窗嗎？
                </span>
              </div>
              <p className="text-[11px] text-stone-600 mt-0.5 leading-snug">
                初次造訪時點擊會直接彈出；若瀏覽器曾被設為封鎖或處於預覽框架，則需點擊解除。
              </p>
            </div>

            <button
              type="button"
              onClick={handleDirectCallPrompt}
              disabled={directCallStatus === 'calling'}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:scale-95 text-stone-950 font-black text-xs shadow-md transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
            >
              <MousePointerClick className="w-3.5 h-3.5" />
              <span>
                {directCallStatus === 'calling'
                  ? '呼叫中...'
                  : directCallStatus === 'success'
                  ? '已成功授權！'
                  : '立即叫出允許視窗'}
              </span>
            </button>
          </div>

          {/* 狀態診斷回饋：為什麼瀏覽器沒有跳出視窗？ */}
          {directCallStatus === 'blocked' && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 text-xs flex items-start gap-2 animate-in fade-in duration-150">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-black text-[11px] text-rose-950">
                  ⚡ 瀏覽器為何沒有跳出視窗？
                </p>
                <p className="text-[11px] text-rose-800 mt-0.5 leading-relaxed">
                  因為瀏覽器（Chrome/Safari）為防惡意騷擾，規定<strong>一旦曾按過「封鎖」或手動關閉，網頁程式碼便嚴格禁止再次彈出視窗</strong>。請照下方步驟點擊網址列左側 <span className="font-bold underline">🔒 鎖頭圖示</span> 將通知改為「允許」即可！
                </p>
              </div>
            </div>
          )}

          {directCallStatus === 'in_iframe' && (
            <div className="p-2.5 rounded-xl bg-amber-100/80 border border-amber-300 text-amber-950 text-xs flex items-start justify-between gap-2 animate-in fade-in duration-150">
              <div className="flex items-start gap-2 min-w-0">
                <Layers className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-black text-[11px]">
                    偵測到目前處於預覽框架 (iFrame) 內
                  </p>
                  <p className="text-[11px] text-amber-900 mt-0.5 leading-tight">
                    瀏覽器安全限制禁止內嵌框架請求推播，請以獨立新分頁開啟本網站以直接跳出允許通知！
                  </p>
                </div>
              </div>
              <a
                href={typeof window !== 'undefined' ? window.location.href : '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-black text-[11px] flex items-center gap-1 shrink-0 shadow-2xs whitespace-nowrap"
              >
                <span>獨立開啟</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        {/* Device Switcher Tabs */}
        <div className="p-3 bg-stone-50 border-b border-stone-200 flex items-center gap-1.5 text-xs font-bold">
          <button
            type="button"
            onClick={() => setDeviceType('android')}
            className={`flex-1 py-1.5 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              deviceType === 'android'
                ? 'bg-white text-stone-900 shadow-2xs font-black border border-stone-200'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <Smartphone className="w-4 h-4 text-emerald-600" />
            <span>Android / Chrome</span>
          </button>
          <button
            type="button"
            onClick={() => setDeviceType('ios')}
            className={`flex-1 py-1.5 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              deviceType === 'ios'
                ? 'bg-white text-stone-900 shadow-2xs font-black border border-stone-200'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <Smartphone className="w-4 h-4 text-blue-600" />
            <span>iPhone / Safari</span>
          </button>
          <button
            type="button"
            onClick={() => setDeviceType('desktop')}
            className={`flex-1 py-1.5 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              deviceType === 'desktop'
                ? 'bg-white text-stone-900 shadow-2xs font-black border border-stone-200'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <Globe className="w-4 h-4 text-purple-600" />
            <span>電腦 / 桌面端</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Step-by-step instructions for Android */}
          {deviceType === 'android' && (
            <div className="space-y-3">
              <h4 className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[11px] font-black">
                  ✓
                </span>
                <span>Android 瀏覽器解除封鎖與開啟步驟（只需 3 秒）</span>
              </h4>
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 flex items-start gap-3">
                  <span className="font-mono font-black text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md shrink-0">
                    步驟 1
                  </span>
                  <div>
                    <p className="font-bold text-stone-900 flex items-center gap-1">
                      <span>點擊網址列左側圖示</span>
                      <Lock className="w-3.5 h-3.5 text-stone-700" />
                    </p>
                    <p className="text-stone-500 text-[11px] mt-0.5">
                      在畫面最上方的網址列左邊，點擊「鎖頭 🔒」或「網站資訊 / 調整設定」圖示。
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 flex items-start gap-3">
                  <span className="font-mono font-black text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md shrink-0">
                    步驟 2
                  </span>
                  <div>
                    <p className="font-bold text-stone-900">找到「權限」或「通知」</p>
                    <p className="text-stone-500 text-[11px] mt-0.5">
                      點選彈出選單中的「權限」或「網站設定」，找到「通知」項目。
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 flex items-start gap-3">
                  <span className="font-mono font-black text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md shrink-0">
                    步驟 3
                  </span>
                  <div>
                    <p className="font-bold text-stone-900">將通知改為「允許」</p>
                    <p className="text-stone-500 text-[11px] mt-0.5">
                      將開關打開或切換至「允許」，完成後點擊下方「重新檢測並啟用」即可！
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step-by-step instructions for iOS */}
          {deviceType === 'ios' && (
            <div className="space-y-3">
              <h4 className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-[11px] font-black">
                  🍎
                </span>
                <span>iPhone / iPad 最佳設定步驟 (iOS 16.4+)</span>
              </h4>

              {!isStandalone ? (
                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 flex items-start gap-3">
                    <span className="font-mono font-black text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md shrink-0">
                      步驟 1
                    </span>
                    <div>
                      <p className="font-bold text-stone-900 flex items-center gap-1.5">
                        點擊 Safari 底部「分享」按鈕
                        <Share className="w-3.5 h-3.5 text-blue-600 inline" />
                      </p>
                      <p className="text-stone-500 text-[11px] mt-0.5">
                        點擊 Safari 下方工具列正中央的「方框帶向上箭頭」圖示。
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 flex items-start gap-3">
                    <span className="font-mono font-black text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md shrink-0">
                      步驟 2
                    </span>
                    <div>
                      <p className="font-bold text-stone-900">選擇「加入主畫面 (Add to Home Screen)」</p>
                      <p className="text-stone-500 text-[11px] mt-0.5">
                        在分享選單中向下滑動，點選「加入主畫面」，右上角點擊「新增」。
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 flex items-start gap-3">
                    <span className="font-mono font-black text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md shrink-0">
                      步驟 3
                    </span>
                    <div>
                      <p className="font-bold text-stone-900">從手機桌面點擊 IdeaX App 打開</p>
                      <p className="text-stone-500 text-[11px] mt-0.5">
                        蘋果 iOS 規定 PWA 必須由主畫面圖示打開，即可直接彈出允許通知視窗並支援鎖定畫面推播！
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 flex items-start gap-3">
                    <span className="font-mono font-black text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md shrink-0">
                      步驟 1
                    </span>
                    <div>
                      <p className="font-bold text-stone-900">打開手機「設定」</p>
                      <p className="text-stone-500 text-[11px] mt-0.5">前往 iPhone「設定」主畫面。</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 flex items-start gap-3">
                    <span className="font-mono font-black text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md shrink-0">
                      步驟 2
                    </span>
                    <div>
                      <p className="font-bold text-stone-900">找到「IdeaX」或「Safari」</p>
                      <p className="text-stone-500 text-[11px] mt-0.5">
                        向下滑動列表找到「IdeaX 創點子」，點選「通知」。
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 flex items-start gap-3">
                    <span className="font-mono font-black text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md shrink-0">
                      步驟 3
                    </span>
                    <div>
                      <p className="font-bold text-stone-900">啟用「允許通知」</p>
                      <p className="text-stone-500 text-[11px] mt-0.5">
                        開啟開關並勾選「鎖定畫面、通知中心、橫幅」，完成後返回 App！
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step-by-step instructions for Desktop */}
          {deviceType === 'desktop' && (
            <div className="space-y-3">
              <h4 className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center text-[11px] font-black">
                  💻
                </span>
                <span>電腦桌面瀏覽器開啟步驟</span>
              </h4>
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 flex items-start gap-3">
                  <span className="font-mono font-black text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded-md shrink-0">
                    步驟 1
                  </span>
                  <div>
                    <p className="font-bold text-stone-900 flex items-center gap-1">
                      <span>點擊網址列左側圖示</span>
                      <Lock className="w-3.5 h-3.5 text-stone-700" />
                    </p>
                    <p className="text-stone-500 text-[11px] mt-0.5">
                      點選瀏覽器上方網址列最左側的「檢視網站資訊」或「鎖頭 🔒」按鈕。
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 flex items-start gap-3">
                  <span className="font-mono font-black text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded-md shrink-0">
                    步驟 2
                  </span>
                  <div>
                    <p className="font-bold text-stone-900">將「通知」設定為「允許」</p>
                    <p className="text-stone-500 text-[11px] mt-0.5">
                      在下拉選單中找到「通知 (Notification)」，切換為「允許 (Allow)」，隨後點擊下方按鈕重新檢測！
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 常見知識 FAQ: 為什麼瀏覽器不能強制彈出視窗？ */}
          <div className="border border-stone-200 rounded-2xl overflow-hidden bg-stone-50/70">
            <button
              type="button"
              onClick={() => setIsFaqOpen(!isFaqOpen)}
              className="w-full p-3 text-left flex items-center justify-between text-xs font-bold text-stone-800 hover:bg-stone-100/80 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-amber-600" />
                <span>為什麼無法由網頁隨時強制叫出「允許通知」視窗？</span>
              </span>
              <ChevronRight
                className={`w-4 h-4 text-stone-400 transition-transform duration-200 ${
                  isFaqOpen ? 'rotate-90' : ''
                }`}
              />
            </button>
            {isFaqOpen && (
              <div className="p-3 pt-0 text-[11px] text-stone-600 space-y-1.5 border-t border-stone-200/60 bg-white leading-relaxed">
                <p>
                  <strong>1. 初次未做決定時：</strong>點擊按鈕確實會直接彈出瀏覽器的系統授權視窗。
                </p>
                <p>
                  <strong>2. 曾按過「封鎖」或關閉時：</strong>各大瀏覽器（Chrome / Safari / Edge）為保護使用者隱私與杜絕垃圾惡意廣告，在底層規範中嚴格規定：<strong>一旦用戶封鎖過，網頁程式碼呼叫將被瀏覽器靜默擋下，絕對禁止網頁重複彈窗騷擾</strong>。此時唯一解除途徑是由用戶點擊網址列左側 🔒 圖示重設。
                </p>
                <p>
                  <strong>3. 框架限制 (iFrame)：</strong>現代瀏覽器禁止跨來源內嵌框架呼叫通知 API，必須在獨立網頁分頁開啟。
                </p>
              </div>
            )}
          </div>

          {/* Social In-app browser warning if detected */}
          {typeof navigator !== 'undefined' &&
            (navigator.userAgent.toLowerCase().includes('line') ||
              navigator.userAgent.toLowerCase().includes('fban') ||
              navigator.userAgent.toLowerCase().includes('fbav')) && (
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-300 text-xs space-y-1.5">
                <p className="font-black text-amber-950 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>社群內建瀏覽器限制提醒</span>
                </p>
                <p className="text-amber-800 text-[11px] leading-relaxed">
                  您目前在 LINE 或 Facebook 內建瀏覽器中開啟，這類瀏覽器不支援 Web Push。請點擊右上角「...」選擇「在 Chrome / Safari 中開啟」。
                </p>
              </div>
            )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={handleCopyUrl}
            className="py-2.5 px-3 rounded-xl border border-stone-200 bg-white hover:bg-stone-100 text-stone-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">已複製網址</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-stone-500" />
                <span>複製網址</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 font-bold text-xs transition-colors cursor-pointer"
            >
              稍後再說
            </button>
            <button
              type="button"
              onClick={handleCheckAgain}
              disabled={isChecking}
              className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-stone-950 font-black text-xs shadow-md flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
              <span>{isChecking ? '檢測中...' : '重新檢測並啟用'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

          {/* Social In-app browser warning if detected */}
          {typeof navigator !== 'undefined' &&
            (navigator.userAgent.toLowerCase().includes('line') ||
              navigator.userAgent.toLowerCase().includes('fban') ||
              navigator.userAgent.toLowerCase().includes('fbav')) && (
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-300 text-xs space-y-1.5">
                <p className="font-black text-amber-950 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>社群內建瀏覽器限制提醒</span>
                </p>
                <p className="text-amber-800 text-[11px] leading-relaxed">
                  您目前在 LINE 或 Facebook 內建瀏覽器中開啟，這類瀏覽器不支援 Web Push。請點擊右上角「...」選擇「在 Chrome / Safari 中開啟」。
                </p>
              </div>
            )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={handleCopyUrl}
            className="py-2.5 px-3 rounded-xl border border-stone-200 bg-white hover:bg-stone-100 text-stone-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">已複製網址</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-stone-500" />
                <span>複製網址</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 font-bold text-xs transition-colors cursor-pointer"
            >
              稍後再說
            </button>
            <button
              type="button"
              onClick={handleCheckAgain}
              disabled={isChecking}
              className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-stone-950 font-black text-xs shadow-md flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
              <span>{isChecking ? '檢測中...' : '重新檢測並啟用'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

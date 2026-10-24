import React, { useState, useEffect } from 'react';
import { Gift, X, Sparkles, Check, AlertCircle, ArrowRight, UserCheck, Heart } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { isRealRegisteredUser } from '../data/mockData';
import { bindAmbassadorReferralCode } from '../services/competitionClientService';

interface RedeemReferralCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (code: string, sharerName?: string) => void;
}

export const RedeemReferralCodeModal: React.FC<RedeemReferralCodeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { currentUser, availableUsers, adjustUserBalance, showCenterToast, openAuthModal, addNotification } = useApp();
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 檢查是否已兌換過
  const hasRedeemed = Boolean(
    currentUser &&
    currentUser.id &&
    typeof window !== 'undefined' &&
    localStorage.getItem(`ideax_redeemed_referral_${currentUser.id}`)
  );

  const redeemedCode = hasRedeemed && typeof window !== 'undefined'
    ? localStorage.getItem(`ideax_redeemed_referral_${currentUser.id}`)
    : '';

  // 自動抓取網址中的 ?ref= 參數預填
  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        const refParam = params.get('ref');
        if (refParam && !code) {
          setCode(refParam.trim());
        }
      } catch {}
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isRealRegisteredUser(currentUser)) {
      showCenterToast('請先登入', '請先登入或註冊帳號再進行推薦碼兌換！', {
        type: 'info',
        duration: 2500,
      });
      openAuthModal('login');
      return;
    }

    const cleanCode = code.trim();
    if (!cleanCode) {
      setErrorMessage('請輸入好友分享給您的推薦代碼');
      return;
    }

    if (hasRedeemed) {
      setErrorMessage(`您先前已成功兌換過推薦代碼【${redeemedCode}】，每位用戶限兌換一次！`);
      return;
    }

    // 防自己兌換自己
    if (
      cleanCode.toLowerCase() === currentUser.id.toLowerCase() ||
      (currentUser.username && cleanCode.toLowerCase() === currentUser.username.toLowerCase()) ||
      cleanCode === currentUser.name
    ) {
      setErrorMessage('不能兌換自己的推薦代碼！請填寫好友或推薦人的代碼。');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. 在平台用戶清單中搜尋分享者（推薦人）
      const sharer = availableUsers.find(
        (u) =>
          u.id.toLowerCase() === cleanCode.toLowerCase() ||
          (u.username && u.username.toLowerCase() === cleanCode.toLowerCase()) ||
          u.name.toLowerCase() === cleanCode.toLowerCase()
      );

      const sharerName = sharer?.name || cleanCode;

      // 2. 為分享者（推薦人）發放獎勵 +100 點！
      if (sharer) {
        adjustUserBalance(
          sharer.id,
          100,
          `【推廣送好禮】好友（${currentUser.name}）成功兌換推薦碼，獲得推薦獎勵 100 點！`
        );
      }

      // 3. 也為兌換者（當前用戶本人）發放歡迎禮 +100 點！
      adjustUserBalance(
        currentUser.id,
        100,
        `【推廣送好禮】成功兌換推薦碼【${cleanCode}】，獲得新手迎新好禮 100 點！`
      );

      // 4. 記錄本地防重兌換標記
      if (typeof window !== 'undefined') {
        localStorage.setItem(`ideax_redeemed_referral_${currentUser.id}`, cleanCode);
      }

      // 5. 非同步回報後端紀錄綁定關係
      try {
        await bindAmbassadorReferralCode(cleanCode);
      } catch (err) {
        // 後端若無獨立紀錄不阻礙前端流程
      }

      // 6. 發布即時通知
      if (addNotification) {
        addNotification({
          title: '🎉 推薦碼兌換成功！',
          message: `您已成功兌換好友【${sharerName}】的推薦碼，已為分享者發放 +100 點推廣獎勵，您的錢包亦入帳 +100 點迎新好禮！`,
          type: 'system',
        });
      }

      showCenterToast(
        '🎉 推薦碼兌換成功！',
        `感謝支持！已為分享者【${sharerName}】送出 100 點推廣獎勵，您亦獲得 100 點！`,
        { type: 'success', duration: 4000 }
      );

      if (onSuccess) {
        onSuccess(cleanCode, sharerName);
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || '兌換失敗，請確認推薦碼是否正確');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl border border-amber-200 overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* 頂部裝飾背景 */}
        <div className="relative bg-gradient-to-r from-amber-500 via-amber-400 to-orange-400 p-6 text-white text-center">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-black/20 hover:bg-black/30 text-white transition-colors cursor-pointer"
            aria-label="關閉"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="w-14 h-14 mx-auto rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-3 shadow-inner">
            <Gift className="w-8 h-8 text-white animate-bounce" />
          </div>
          <h2 className="text-xl font-black tracking-tight">兌換推薦碼享好禮</h2>
          <p className="text-xs text-amber-100 font-medium mt-1">
            填入好友推薦碼，分享者即享 <span className="font-bold underline text-white">+100 點</span> 推廣獎勵！
          </p>
        </div>

        {/* 內容區塊 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {hasRedeemed ? (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
              <div className="w-10 h-10 mx-auto rounded-full bg-emerald-500 text-white flex items-center justify-center">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>
              <h3 className="text-sm font-black text-emerald-900">您已成功兌換過推薦碼</h3>
              <p className="text-xs text-emerald-700">
                先前已綁定代碼：<span className="font-mono font-bold">{redeemedCode}</span>
              </p>
              <p className="text-[11px] text-stone-500 pt-1">
                每位用戶限兌換一次推薦碼。您可以將自己的推薦碼分享給其他人，每位好友兌換您也能享 +100 點！
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-black text-stone-700 mb-1.5">
                  推薦代碼（用戶 ID / 暱稱 / 代碼）
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="例如：user-abc12345 或好友名稱"
                    className="w-full px-4 py-3 rounded-2xl border border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-sm font-medium outline-none transition-all"
                    autoFocus
                  />
                  {code && (
                    <button
                      type="button"
                      onClick={() => setCode('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 rounded-full"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {errorMessage && (
                  <p className="text-xs text-rose-600 font-bold mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errorMessage}</span>
                  </p>
                )}
              </div>

              {/* 雙向獎勵提示 */}
              <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 space-y-1.5 text-xs">
                <div className="flex items-center gap-1.5 text-amber-900 font-bold">
                  <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                  <span>推薦機制與回饋福利：</span>
                </div>
                <ul className="text-stone-600 space-y-1 pl-4 list-disc text-[11px]">
                  <li>
                    成功填寫後，系統將直接為<b>分享者（推薦人）</b>發放 <b>+100 點</b>獎勵！
                  </li>
                  <li>
                    您的帳號亦將獲得 <b>+100 點</b>新手迎新獎勵點數。
                  </li>
                  <li>每個會員帳號限輸入一次推薦代碼，不可填寫自己的代號。</li>
                </ul>
              </div>

              {/* 操作按鈕 */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-1/3 py-2.5 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !code.trim()}
                  className="w-2/3 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-98 disabled:opacity-50 text-white text-xs font-black shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting ? (
                    <span>兌換中...</span>
                  ) : (
                    <>
                      <span>確認兌換</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          {hasRedeemed && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                關閉
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

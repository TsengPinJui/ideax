import React, { useState, useEffect } from 'react';
import { Gift, X, Sparkles, Check, AlertCircle, ArrowRight, UserCheck, Heart, Zap, History } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { isRealRegisteredUser } from '../data/mockData';
import { bindAmbassadorReferralCode } from '../services/competitionClientService';
import {
  recordReferralRedemption,
  getReferralStats,
  findReferrerUser,
  getUserReferralCode,
  isPublicIdentityString,
} from '../services/referralService';

interface RedeemReferralCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (code: string, sharerName?: string) => void;
  onOpenShareModal?: () => void;
}

export const RedeemReferralCodeModal: React.FC<RedeemReferralCodeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onOpenShareModal,
}) => {
  const { currentUser, availableUsers, adjustUserBalance, showCenterToast, openAuthModal, addNotification } = useApp();
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastRedeemedSuccess, setLastRedeemedSuccess] = useState<{ code: string; sharerName: string } | null>(null);

  // 取得已兌換紀錄列表（不限次數）
  const stats = getReferralStats(currentUser.id);
  const historyList = stats.redemptionHistory || [];

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
    setLastRedeemedSuccess(null);

    if (!isRealRegisteredUser(currentUser)) {
      showCenterToast('請先登入', '請先登入或註冊帳號再進行推薦碼兌換！', {
        type: 'info',
        duration: 2500,
      });
      openAuthModal('login');
      return;
    }

    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      setErrorMessage('請輸入好友分享給您的推薦代碼');
      return;
    }

    // 嚴格阻擋公開的用戶帳號、ID、會員編號或姓名
    if (isPublicIdentityString(cleanCode, availableUsers)) {
      setErrorMessage(
        '公開的會員帳號、用戶 ID 或姓名不能當作推薦碼！推薦碼為每位會員專屬的 8 位隨機英數代碼（格式如：IX-9K4M7P），請向好友索取其「分享推薦碼」中的專屬隨機代碼。'
      );
      return;
    }

    // 防自己兌換自己
    const myCode = getUserReferralCode(currentUser).toUpperCase();
    if (
      cleanCode === myCode ||
      cleanCode.toLowerCase() === currentUser.id.toLowerCase() ||
      (currentUser.username && cleanCode.toLowerCase() === currentUser.username.toLowerCase()) ||
      (currentUser.memberId && cleanCode === currentUser.memberId.toUpperCase()) ||
      cleanCode === currentUser.name?.toUpperCase()
    ) {
      setErrorMessage('不能兌換自己的推薦代碼！請填寫好友或合作夥伴的專屬隨機推薦碼。');
      return;
    }

    // 防重複兌換同一組代碼（不限兌換次數，但同一組代碼僅能兌換一次）
    if (historyList.some((item) => item.code.toUpperCase() === cleanCode)) {
      setErrorMessage('您已經兌換過此組推薦碼！您可以輸入其他好友的專屬隨機推薦碼繼續獲得好禮（不限總兌換次數）。');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. 嚴格在平台真實用戶清單中搜尋分享者（推薦人）
      const sharer = findReferrerUser(cleanCode, availableUsers);

      // 若查無此會員推薦碼，嚴格阻擋並提示錯誤，絕不發放任何點數
      if (!sharer) {
        setErrorMessage('查無此推薦代碼！請向好友確認正確的 8 位隨機推薦代碼（例如：IX-9K4M7P）。公開帳號 ID 或姓名無法兌換。');
        setIsSubmitting(false);
        return;
      }

      const sharerName = sharer.name || sharer.username || cleanCode;

      // 2. 為分享者（推薦人）發放推廣獎勵 +100 點！
      adjustUserBalance(
        sharer.id,
        100,
        `【推廣送好禮】好友（${currentUser.name}）成功兌換您的推薦碼【${cleanCode}】，獲得推廣獎勵 100 點！`
      );

      // 3. 也為兌換者（當前用戶本人）發放福利點數 +100 點！
      adjustUserBalance(
        currentUser.id,
        100,
        `【推廣送好禮】成功兌換好友【${sharerName}】的推薦碼【${cleanCode}】，獲得迎新福利 100 點！`
      );

      // 4. 記錄此筆兌換與推廣統計（不限次數累計）
      recordReferralRedemption(currentUser, sharer, cleanCode);

      // 5. 非同步回報後端紀錄綁定與兌換
      try {
        await bindAmbassadorReferralCode(cleanCode);
        await fetch('/api/competition/ambassador/bind', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ referralCode: cleanCode, redeemerId: currentUser.id }),
        }).catch(() => {});
      } catch (err) {}

      // 6. 發布即時通知
      if (addNotification) {
        addNotification({
          title: '🎉 推薦碼兌換成功！',
          message: `您已成功兌換【${sharerName}】的推薦碼，已為分享者發送 +100 點推廣獎勵，您的錢包亦入帳 +100 點！`,
          type: 'system',
        });
      }

      showCenterToast(
        '🎉 推薦碼兌換成功！',
        `已為分享者【${sharerName}】送出 100 點推廣獎勵，您亦獲得 100 點！不限次數，歡迎繼續兌換或分享！`,
        { type: 'success', duration: 4000 }
      );

      setLastRedeemedSuccess({ code: cleanCode, sharerName });
      setCode('');

      if (onSuccess) {
        onSuccess(cleanCode, sharerName);
      }
    } catch (err: any) {
      setErrorMessage(err.message || '兌換失敗，請確認推薦碼是否正確');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl border border-amber-200 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* 頂部裝飾背景 */}
        <div className="relative bg-gradient-to-r from-amber-500 via-amber-400 to-orange-400 p-5 text-white text-center shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-black/20 hover:bg-black/30 text-white transition-colors cursor-pointer"
            aria-label="關閉"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="w-12 h-12 mx-auto rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-2 shadow-inner">
            <Gift className="w-7 h-7 text-white animate-bounce" />
          </div>
          <h2 className="text-xl font-black tracking-tight">兌換推薦碼享好禮</h2>
          <p className="text-xs text-amber-100 font-medium mt-0.5">
            <b>不限兌換次數</b> · 每成功兌換一組，分享者即享 <span className="font-bold underline text-white">+100 點</span>！
          </p>
        </div>

        {/* 內容區塊 */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* 上次兌換成功高亮提示 */}
          {lastRedeemedSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 animate-in fade-in zoom-in-95">
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                <Check className="w-5 h-5 stroke-[3]" />
              </div>
              <div className="text-left text-xs min-w-0 flex-1">
                <p className="font-black text-emerald-900">
                  成功兌換【{lastRedeemedSuccess.code}】
                </p>
                <p className="text-emerald-700 text-[11px]">
                  已為分享者「{lastRedeemedSuccess.sharerName}」發放 +100 點推廣獎勵！
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-black text-stone-700 mb-1.5">
              填寫好友推薦代碼
            </label>
            <div className="relative">
              <input
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="請輸入 8 位專屬隨機推薦碼（例如：IX-9K4M7P）"
                className="w-full px-4 py-3 rounded-2xl border border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-sm font-mono font-bold tracking-wider outline-none transition-all uppercase placeholder:normal-case placeholder:font-normal placeholder:tracking-normal"
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

          {/* 推薦機制說明：不限次數 */}
          <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 space-y-1.5 text-xs text-left">
            <div className="flex items-center gap-1.5 text-amber-900 font-bold">
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              <span>推薦碼兌換系統規則：</span>
            </div>
            <ul className="text-stone-600 space-y-1 pl-4 list-disc text-[11px]">
              <li>
                <b>兌換不限次數</b>：推薦越多、兌換越多，雙方獲得獎勵無上限！
              </li>
              <li>
                <b>專屬隨機保密碼</b>：推薦碼為 8 位隨機英數代碼（格式如 IX-XXXXXX），公開的帳號 ID 或姓名無法兌換，保障安全與隱私。
              </li>
              <li>
                每次成功填入，系統即刻為<b>分享者（推薦人）</b>發放 <b>+100 點</b>獎勵。
              </li>
              <li>
                您亦可獲得 <b>+100 點</b>福利點數！
              </li>
              <li>不可填寫自己的推薦代碼。</li>
            </ul>
          </div>

          {/* 歷史兌換清單 */}
          {historyList.length > 0 && (
            <div className="space-y-1.5 text-left">
              <span className="text-[11px] font-bold text-stone-500 flex items-center gap-1">
                <History className="w-3 h-3" />
                <span>已兌換的好友推薦紀錄（共 {historyList.length} 筆）：</span>
              </span>
              <div className="max-h-24 overflow-y-auto space-y-1 scrollbar-thin">
                {historyList.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-1 px-2.5 rounded-lg bg-stone-50 border border-stone-200/80 text-[11px]"
                  >
                    <span className="font-mono font-bold text-stone-800">{item.code}</span>
                    <span className="text-stone-500 truncate max-w-[120px]">{item.sharerName}</span>
                    <span className="font-mono font-bold text-amber-600">+{item.points} 點</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 操作按鈕 */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-2.5 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-700 text-xs font-bold transition-colors cursor-pointer"
            >
              關閉
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
                  <span>立即兌換 (+100 點)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

          {/* 快速切換至分享我的代碼 */}
          {onOpenShareModal && (
            <div className="text-center pt-1 border-t border-stone-100">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenShareModal();
                }}
                className="text-xs font-bold text-amber-700 hover:text-amber-800 underline cursor-pointer"
              >
                查看並複製我的專屬推薦碼 ↗
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

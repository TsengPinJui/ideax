import React, { useState } from 'react';
import { Gift, X, Copy, Check, Users, Sparkles, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getUserReferralCode, copyPureReferralCode, getReferralStats } from '../services/referralService';

interface ShareReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRedeem?: () => void;
}

export const ShareReferralModal: React.FC<ShareReferralModalProps> = ({
  isOpen,
  onClose,
  onOpenRedeem,
}) => {
  const { currentUser, showCenterToast } = useApp();
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen) return null;

  const referralCode = getUserReferralCode(currentUser);
  const stats = getReferralStats(currentUser.id);

  // 點擊複製：只複製純推薦碼，絕不包含任何網址或其他文字
  const handleCopyOnlyCode = async () => {
    const success = await copyPureReferralCode(referralCode);
    if (success) {
      setIsCopied(true);
      showCenterToast(
        '已複製純推薦碼！',
        `已將代碼「${referralCode}」複製至剪貼簿（純代碼，無多餘文字或網址）`,
        { type: 'success', duration: 3000 }
      );
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl border border-amber-200 overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* 頂部裝飾頭部 */}
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
          <h2 className="text-xl font-black tracking-tight">您的專屬推薦碼</h2>
          <p className="text-xs text-amber-100 font-medium mt-1">
            好友兌換成功，您即享 <span className="font-bold underline text-white">+100 點/人</span>，不限次數！
          </p>
        </div>

        {/* 內容區塊 */}
        <div className="p-6 space-y-4">
          {/* 推薦代碼大字展示卡（直接顯示並可純複製） */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100/60 border border-amber-300 text-center space-y-2.5 shadow-xs">
            <span className="text-[11px] font-bold text-amber-800 tracking-wider block">
              點擊直接複製純代碼
            </span>
            <div
              onClick={handleCopyOnlyCode}
              className="py-3 px-4 rounded-xl bg-white border border-amber-300/80 shadow-inner flex items-center justify-center gap-3 cursor-pointer hover:border-amber-500 transition-colors group"
              title="點擊直接複製純推薦碼"
            >
              <span className="font-mono text-2xl sm:text-3xl font-black tracking-wider text-stone-900 group-hover:text-amber-600 transition-colors select-all">
                {referralCode}
              </span>
              <div className="p-1.5 rounded-lg bg-amber-100 group-hover:bg-amber-200 text-amber-800 transition-colors shrink-0">
                {isCopied ? <Check className="w-4 h-4 text-emerald-600 stroke-[3]" /> : <Copy className="w-4 h-4" />}
              </div>
            </div>

            {/* 純複製按鈕 */}
            <button
              type="button"
              onClick={handleCopyOnlyCode}
              className={`w-full py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-98 ${
                isCopied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white'
              }`}
            >
              {isCopied ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>已複製純代碼（無網址與多餘文字）</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>複製推薦碼（只複製代碼）</span>
                </>
              )}
            </button>
          </div>

          {/* 推薦成效與規則亮點 */}
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200/80">
              <span className="text-[11px] font-bold text-stone-500 block">累計推薦人數</span>
              <span className="text-xl font-black font-mono text-stone-900 mt-0.5 block">
                {stats.successfulCount} <span className="text-xs font-bold text-stone-500">人</span>
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200">
              <span className="text-[11px] font-bold text-amber-800 block">累計推廣獲贈</span>
              <span className="text-xl font-black font-mono text-amber-600 mt-0.5 block">
                +{stats.totalPointsEarned} <span className="text-xs font-bold text-amber-700">點</span>
              </span>
            </div>
          </div>

          {/* 規則說明：不限次數，推薦越多獎勵越多 */}
          <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-600 space-y-1">
            <div className="flex items-center gap-1.5 text-stone-900 font-black">
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              <span>推廣獎勵機制（無上限）：</span>
            </div>
            <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-stone-500">
              <li>推薦好友加入或於「兌換推薦碼」輸入您的代碼，您即可獲得 <b>+100 點/人</b>。</li>
              <li><b>專屬隨機保密碼</b>：推薦碼為個人專屬 8 位隨機英數代碼，獨立於公開的帳號 ID 與姓名，保護隱私安全。</li>
              <li><b>兌換不限次數</b>：推薦越多好友，獲得的獎勵點數無上限累積！</li>
              <li>複製時僅複製純代碼本身，方便好友直接貼入兌換。</li>
            </ul>
          </div>

          {/* 快捷引導與關閉按鍵 */}
          <div className="flex items-center gap-2 pt-1">
            {onOpenRedeem && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenRedeem();
                }}
                className="w-1/2 py-2.5 rounded-xl border border-amber-300 hover:bg-amber-50 text-amber-900 text-xs font-black transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>輸入好友推薦碼</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className={`${onOpenRedeem ? 'w-1/2' : 'w-full'} py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-colors cursor-pointer`}
            >
              完成
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

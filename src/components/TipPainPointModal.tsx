import React, { useState } from 'react';
import { Question } from '../types';
import { useApp } from '../context/AppContext';
import {
  X,
  Coins,
  CheckCircle2,
  Sparkles,
  Wallet,
  CreditCard,
} from 'lucide-react';
import { resolveUserDisplayName, getUserNameColorClass } from '../utils/userDisplay';

interface TipPainPointModalProps {
  question: Question;
  onClose: () => void;
  onOpenTopUp?: () => void;
  isOpen?: boolean;
}

const PRESET_AMOUNTS = [50, 100, 300, 500, 1000];

export const TipPainPointModal: React.FC<TipPainPointModalProps> = ({
  question,
  onClose,
  onOpenTopUp,
  isOpen = true,
}) => {
  const {
    currentUser,
    availableUsers,
    tipPainPoint,
    showCenterToast,
  } = useApp();
  // 創點子的打賞一律使用點數（創星幣只在創星季競賽頁使用，不走這個視窗）
  const isRaceMode = false;

  const [amount, setAmount] = useState<number>(100);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [paymentSource, setPaymentSource] = useState<'wallet' | 'direct'>('wallet');
  const [directMethod, setDirectMethod] = useState<'信用卡' | 'LINE Pay' | 'Apple Pay'>('信用卡');

  if (isOpen === false) return null;

  const isSoftwareApp = question.postType === 'vibecoding_app';
  const isProposal = question.postType === 'innovation_proposal';
  const targetLabel = isSoftwareApp ? '作品' : isProposal ? '提案' : '痛點';

  const authorDisplayName = resolveUserDisplayName(
    question.authorId,
    question.authorName,
    availableUsers
  );
  const authorColorClass = getUserNameColorClass(question.authorId, availableUsers, {
    name: question.authorName,
  });

  const finalAmount = customAmount.trim() !== '' ? Number(customAmount) : amount;

  const walletBalance = typeof currentUser.points === 'number' ? currentUser.points : (currentUser.balance || 0);
  const userStarBalance =
    typeof (currentUser as any).starCoins === 'number'
      ? (currentUser as any).starCoins
      : Math.max(walletBalance, 10000);
  const currentBalance = isRaceMode ? userStarBalance : walletBalance;
  const currencyName = isRaceMode ? '創星幣' : '點';
  const hasEnoughPoints = isRaceMode
    ? currentBalance >= finalAmount
    : paymentSource === 'direct' || currentBalance >= finalAmount;

  const quickMessages = isSoftwareApp
    ? ['作品很實用，支持持續更新！', '介面順手好用，謝謝分享！', '期待之後的新功能！']
    : isProposal
    ? ['看好這個提案落地！', '架構很清楚，支持推進！', '很有價值的解決方案！']
    : ['這也是我遇到的問題，支持發起！', '分析得很到位，希望能找到好解法！'];

  const handleConfirmTip = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!finalAmount || finalAmount <= 0 || isNaN(finalAmount)) {
      showCenterToast('請輸入有效的支持數額');
      return;
    }

    const res = tipPainPoint(
      question.id,
      finalAmount,
      message,
      isRaceMode ? 'wallet' : paymentSource
    );
    if (!res.success) {
      showCenterToast(res.message || '操作失敗');
      return;
    }

    setIsSuccess(true);
    showCenterToast(
      isRaceMode
        ? `🎉 已投入 ${finalAmount.toLocaleString()} 創星幣支持「${authorDisplayName}」`
        : `🎉 已支持「${authorDisplayName}」${finalAmount} 點`
    );
  };

  return (
    <div
      className="fixed inset-0 z-[200] bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="relative z-[201] bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-amber-200/80 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between bg-gradient-to-r from-amber-50/50 via-white to-amber-50/30">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-800 border border-amber-300/80 flex items-center justify-center shrink-0 shadow-2xs">
              {isRaceMode ? <Sparkles className="w-5 h-5 text-amber-700" /> : <Coins className="w-5 h-5 text-amber-700" />}
            </div>
            <div>
              <h3 className="text-base font-black text-stone-900 flex items-center gap-1.5">
                {isRaceMode ? `用創星幣支持${targetLabel}` : `點數支持${targetLabel}`}
              </h3>
              <p className="text-xs text-stone-600">
                支持作者：<span className={authorColorClass}>{authorDisplayName}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
            title="關閉視窗"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {isSuccess ? (
            <div className="py-5 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200 shadow-2xs">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-black text-stone-900">
                  已送出 {finalAmount.toLocaleString()} {currencyName}支持！
                </h4>
                <p className="text-xs text-stone-600">
                  支持數額已成功計入 <span className={`font-bold ${authorColorClass}`}>{authorDisplayName}</span> 的人氣累積與帳戶。
                </p>
              </div>
              {message.trim() && (
                <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80 text-xs text-stone-700 text-left">
                  「{message}」
                </div>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onClose();
                }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs transition-colors cursor-pointer shadow-md shadow-amber-500/20 active:scale-98"
              >
                完成並返回
              </button>
            </div>
          ) : (
            <>
              {/* Target Title */}
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/80">
                <div className="text-[11px] text-stone-500 mb-0.5 font-bold">
                  {targetLabel}名稱
                </div>
                <p className="text-xs font-black text-stone-900 line-clamp-2">
                  {question.appName || question.title}
                </p>
              </div>

              {/* Amount Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-stone-700">
                    選擇支持數額
                  </label>
                  <span className="text-xs text-stone-500">
                    可用餘額：<strong className="text-amber-800 font-mono font-black">{currentBalance.toLocaleString()}</strong> {currencyName}
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-1.5 mb-2.5">
                  {PRESET_AMOUNTS.map((preset) => {
                    const isSelected = customAmount === '' && amount === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAmount(preset);
                          setCustomAmount('');
                        }}
                        className={`py-2 rounded-xl font-mono font-black text-xs border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-xs scale-102'
                            : 'bg-white text-stone-700 border-stone-200 hover:border-amber-300 hover:bg-amber-50/50'
                        }`}
                      >
                        {preset}
                      </button>
                    );
                  })}
                </div>

                <div className="relative">
                  <input
                    type="number"
                    min={10}
                    max={50000}
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="或直接輸入自訂點數..."
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-mono text-stone-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 font-bold">
                    {currencyName}
                  </span>
                </div>
              </div>

              {/* Payment Method (only in non-race mode) */}
              {!isRaceMode && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-stone-700">
                    付款方式（目前暫時只支援平台點數扣點）
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPaymentSource('wallet');
                      }}
                      className="p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 bg-amber-500 text-stone-950 border-amber-500 font-bold shadow-2xs"
                    >
                      <Wallet className="w-4 h-4 shrink-0" />
                      <div>
                        <div className="text-xs font-black">平台點數扣點</div>
                        <div className="text-[10px] font-mono text-stone-900 font-bold">
                          餘額 {walletBalance.toLocaleString()} 點
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      disabled
                      className="p-2.5 rounded-xl border text-left transition-all flex items-center gap-2 bg-stone-50 text-stone-400 border-stone-200 opacity-60 cursor-not-allowed"
                    >
                      <CreditCard className="w-4 h-4 shrink-0" />
                      <div>
                        <div className="text-xs font-black">外部金流支付</div>
                        <div className="text-[10px] text-stone-400">
                          暫不支援 (信用卡 / LINE Pay)
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Message */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  給作者的留言（選填）
                </label>
                <input
                  type="text"
                  maxLength={80}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="寫句話鼓勵作者..."
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs text-stone-800 focus:outline-none focus:border-amber-500"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {quickMessages.map((qm) => (
                    <button
                      key={qm}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMessage(qm);
                      }}
                      className="text-[11px] px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-amber-100/80 text-stone-700 hover:text-amber-900 border border-stone-200/80 transition-colors cursor-pointer font-medium"
                    >
                      {qm}
                    </button>
                  ))}
                </div>
              </div>

              {/* Insufficient Balance Warning */}
              {!hasEnoughPoints && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-2">
                  <span className="text-xs text-rose-700 font-bold">
                    {isRaceMode ? '創星幣餘額不足' : '點數餘額不足'}
                  </span>
                  {!isRaceMode && onOpenTopUp && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                        onOpenTopUp();
                      }}
                      className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                    >
                      前往儲值
                    </button>
                  )}
                </div>
              )}

              {/* Note & Actions */}
              <div className="pt-2 border-t border-stone-100 space-y-3">
                <p className="text-[11px] text-stone-500 leading-relaxed">
                  {isRaceMode
                    ? '創星幣為創星季競賽專用虛擬積分，支持後直接計入該作品人氣排行。'
                    : '支持的點數將扣除 10% 平台維護費後，90% 轉入作者帳戶。'}
                </p>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onClose();
                    }}
                    className="flex-1 py-2.5 rounded-xl border border-stone-300 text-stone-700 font-bold text-xs hover:bg-stone-100 transition-colors cursor-pointer"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    disabled={!hasEnoughPoints || !finalAmount || finalAmount <= 0}
                    onClick={handleConfirmTip}
                    className="flex-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-stone-950 font-black text-xs transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
                  >
                    <span>
                      確認支持 {finalAmount > 0 ? `${finalAmount.toLocaleString()} ${currencyName}` : ''}
                    </span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

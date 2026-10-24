import React, { useState } from 'react';
import {
  ArrowRight,
  Gift,
  Share2,
  Sparkles,
  Check,
  Copy,
  X,
  Tag,
  MessageSquare,
  Lightbulb,
  Globe,
  PlusCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { isRealRegisteredUser } from '../data/mockData';
import { RedeemReferralCodeModal } from './RedeemReferralCodeModal';

interface HomeAnnouncementBannerProps {
  onOpenRegister: () => void;
  onOpenCreateDiscussion: () => void;
  onOpenCreatePainPoint: () => void;
  onOpenCreateApp: () => void;
  onOpenCreateProposal: () => void;
}

export const HomeAnnouncementBanner: React.FC<HomeAnnouncementBannerProps> = ({
  onOpenRegister,
  onOpenCreateDiscussion,
  onOpenCreatePainPoint,
  onOpenCreateApp,
  onOpenCreateProposal,
}) => {
  const { currentUser, showCenterToast, openAuthModal } = useApp();
  const isRegistered = isRealRegisteredUser(currentUser);
  const [isCopied, setIsCopied] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);
  const [showPublishDropdown, setShowPublishDropdown] = useState(false);
  const [showPostDropdown, setShowPostDropdown] = useState(false);

  if (isDismissed) return null;

  // 複製專屬推薦碼 / 邀請連結
  const handleCopyReferral = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isRegistered) {
      showCenterToast('請先登入或註冊', '登入後即可取得您的專屬推薦碼與邀請連結！', {
        type: 'info',
        duration: 2500,
      });
      openAuthModal('login');
      return;
    }

    const referralCode = currentUser.id || 'ideax-user';
    const referralUrl = `${window.location.origin}/?ref=${encodeURIComponent(referralCode)}`;
    const shareText = `【IdeaX 創點子】加入全台最大的痛點許願、軟體作品展場與創新提案孵化平台！註冊立即送 100 點，填入推薦碼「${referralCode}」一起探索：${referralUrl}`;

    try {
      await navigator.clipboard.writeText(shareText);
      setIsCopied(true);
      showCenterToast('🎉 推薦連結已複製！', '分享給好友註冊填入，每位成功兌換即為您送上 +100 點獎勵！', {
        type: 'success',
        duration: 3500,
      });
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      showCenterToast('推薦碼複製完成', `您的專屬推薦代碼為：${referralCode}`, {
        type: 'success',
        duration: 3000,
      });
    }
  };

  return (
    <>
      {/* 精簡、無邊框版位設計 */}
      <div className="relative z-20 w-full max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 pt-1.5 pb-1">
        <div className="relative bg-amber-50/50 backdrop-blur-sm rounded-2xl px-3.5 py-2 sm:px-4 sm:py-2.5 text-stone-900 transition-all">
          {/* 頂部標題列與功能按鍵區 */}
          <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xs sm:text-sm font-black text-stone-900 tracking-tight flex items-center gap-1.5 flex-wrap">
                <span className="text-amber-800">推廣送好禮</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100/90 text-amber-800 text-[10px] font-bold">
                  <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                  <span>持續上新中~</span>
                </span>
                <span className="hidden lg:inline text-[11px] font-medium text-stone-500">
                  · 分享推薦碼或兌換好友推薦碼，即享點數激勵！
                </span>
              </h2>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* 兌換推薦碼按鍵 */}
              <button
                type="button"
                onClick={() => setIsRedeemModalOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-[11px] font-black transition-all cursor-pointer shadow-2xs"
                title="填寫好友的推薦碼，分享者即享 +100 點獎勵"
              >
                <Gift className="w-3.5 h-3.5" />
                <span>兌換推薦碼</span>
              </button>

              {/* 複製推薦碼按鍵 */}
              <button
                type="button"
                onClick={handleCopyReferral}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white hover:bg-amber-100/80 active:scale-95 text-amber-800 text-[11px] font-bold transition-all cursor-pointer shadow-2xs"
                title="複製您的專屬推薦碼分享給好友"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? '已複製' : '分享推薦碼'}</span>
              </button>

              {/* 關閉按鈕 */}
              <button
                type="button"
                onClick={() => setIsDismissed(true)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-amber-100/60 transition-colors cursor-pointer"
                title="暫時收合"
                aria-label="收合公告"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 流程步驟橫條（註冊送100點 -> 分享推薦碼+100點/人 -> 發布討論或痛點+100點 -> 刊登作品或創新提案+300點） */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-0.5 pt-0.5 scrollbar-none select-none text-[11px] sm:text-xs">
            {/* 步驟 1: 註冊送 100 點 */}
            <div
              onClick={() => {
                if (!isRegistered) openAuthModal('register', 'email');
              }}
              className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition-all ${
                isRegistered
                  ? 'bg-amber-100/60 text-amber-900 cursor-default'
                  : 'bg-white hover:bg-amber-100/80 text-stone-800 cursor-pointer active:scale-98 shadow-2xs'
              }`}
              title={isRegistered ? '已領取註冊福利' : '點擊立即免費註冊領取 100 點'}
            >
              <div className="w-4 h-4 rounded-md bg-amber-500 text-white flex items-center justify-center shrink-0">
                <Gift className="w-2.5 h-2.5" />
              </div>
              <span className="font-bold text-stone-700">註冊送</span>
              <span className="font-black font-mono text-amber-700 bg-amber-100/90 px-1 py-0.2 rounded">
                100 點
              </span>
              {isRegistered && <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />}
            </div>

            {/* 箭頭 */}
            <ArrowRight className="w-3 h-3 text-amber-400 shrink-0 stroke-[2.5]" />

            {/* 步驟 2: 分享推薦碼+100點/人 */}
            <div
              onClick={handleCopyReferral}
              className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white hover:bg-amber-100/80 text-stone-800 cursor-pointer active:scale-98 transition-all shadow-2xs"
              title="點擊複製您的推薦碼分享給朋友"
            >
              <div className="w-4 h-4 rounded-md bg-orange-500 text-white flex items-center justify-center shrink-0">
                <Share2 className="w-2.5 h-2.5" />
              </div>
              <span className="font-bold text-stone-700">分享推薦碼</span>
              <span className="font-black font-mono text-orange-700 bg-orange-100/90 px-1 py-0.2 rounded">
                +100 點/人
              </span>
            </div>

            {/* 箭頭 */}
            <ArrowRight className="w-3 h-3 text-amber-400 shrink-0 stroke-[2.5]" />

            {/* 步驟 3: 發布討論或痛點+100點 */}
            <div className="relative shrink-0">
              <div
                onClick={() => setShowPostDropdown((prev) => !prev)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white hover:bg-amber-100/80 text-stone-800 cursor-pointer active:scale-98 transition-all shadow-2xs"
                title="點擊發布生活煩惱或展開交流"
              >
                <div className="w-4 h-4 rounded-md bg-rose-500 text-white flex items-center justify-center shrink-0">
                  <MessageSquare className="w-2.5 h-2.5" />
                </div>
                <span className="font-bold text-stone-700">發布討論或痛點</span>
                <span className="font-black font-mono text-rose-700 bg-rose-100/90 px-1 py-0.2 rounded">
                  +100 點
                </span>
              </div>

              {/* 下拉選單 */}
              {showPostDropdown && (
                <div
                  className="absolute left-0 top-full mt-1.5 w-44 rounded-xl bg-white shadow-xl border border-stone-200 py-1 z-30 animate-in fade-in zoom-in-95 duration-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setShowPostDropdown(false);
                      onOpenCreateDiscussion();
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-stone-50 flex items-center gap-2 text-xs font-bold text-stone-800 cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-stone-500" />
                    <span>發起自由交流討論</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPostDropdown(false);
                      onOpenCreatePainPoint();
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-rose-50 flex items-center gap-2 text-xs font-bold text-rose-700 cursor-pointer"
                  >
                    <Tag className="w-3.5 h-3.5 text-rose-500" />
                    <span>提出痛點許願</span>
                  </button>
                </div>
              )}
            </div>

            {/* 箭頭 */}
            <ArrowRight className="w-3 h-3 text-amber-400 shrink-0 stroke-[2.5]" />

            {/* 步驟 4: 刊登作品或創新提案+300點 */}
            <div className="relative shrink-0">
              <div
                onClick={() => setShowPublishDropdown((prev) => !prev)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white cursor-pointer active:scale-98 transition-all shadow-2xs"
                title="點擊刊登您的軟體網站作品或發起創新商業提案"
              >
                <Sparkles className="w-3 h-3 text-amber-300 shrink-0" />
                <span className="font-bold">刊登作品或創新提案</span>
                <span className="font-black font-mono text-purple-900 bg-amber-300 px-1 py-0.2 rounded">
                  +300 點 🚀
                </span>
              </div>

              {/* 下拉選單 */}
              {showPublishDropdown && (
                <div
                  className="absolute right-0 top-full mt-1.5 w-48 rounded-xl bg-white shadow-xl border border-stone-200 py-1 z-30 animate-in fade-in zoom-in-95 duration-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setShowPublishDropdown(false);
                      onOpenCreateApp();
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-purple-50 flex items-center gap-2 text-xs font-bold text-purple-900 cursor-pointer"
                  >
                    <Globe className="w-3.5 h-3.5 text-purple-600" />
                    <span>刊登軟體網站作品</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPublishDropdown(false);
                      onOpenCreateProposal();
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-amber-50 flex items-center gap-2 text-xs font-bold text-amber-900 cursor-pointer"
                  >
                    <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                    <span>發布創新提案</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 兌換推薦碼彈窗 */}
      <RedeemReferralCodeModal
        isOpen={isRedeemModalOpen}
        onClose={() => setIsRedeemModalOpen(false)}
      />
    </>
  );
};

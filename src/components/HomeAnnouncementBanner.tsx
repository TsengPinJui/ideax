import React, { useState } from 'react';
import {
  Megaphone,
  ArrowRight,
  Gift,
  Share2,
  MessageSquare,
  Sparkles,
  ChevronRight,
  Check,
  Copy,
  PlusCircle,
  X,
  Lightbulb,
  Globe,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { isRealRegisteredUser } from '../data/mockData';

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
      showCenterToast('🎉 推薦連結已複製！', '分享給好友註冊，每邀請一位成功加入即享 +100 點獎勵！', {
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
    <div className="relative z-20 w-full max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 pt-2 pb-1">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-400 p-[1.5px] shadow-sm hover:shadow-md transition-shadow">
        <div className="relative rounded-[15px] bg-gradient-to-r from-amber-50/95 via-amber-50/90 to-orange-50/95 backdrop-blur-md px-3.5 py-2.5 sm:px-5 sm:py-3 text-stone-900">
          {/* 頂部標題列與關閉鈕 */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-600 to-orange-600 text-white text-[11px] font-black tracking-wide shadow-xs">
                <Megaphone className="w-3.5 h-3.5 animate-bounce" />
                <span>平台好康公告</span>
              </span>
              <h2 className="text-xs sm:text-sm font-black text-stone-900 tracking-tight flex items-center gap-1.5 flex-wrap">
                <span>多多分享得好禮</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[10px] font-black shadow-2xs">
                  <Sparkles className="w-2.5 h-2.5 text-amber-200" />
                  <span>持續上新中~</span>
                </span>
                <span className="hidden md:inline text-[11px] font-bold text-amber-800">
                  · 邀請好友與發布內容，天天賺點無上限！
                </span>
              </h2>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleCopyReferral}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-[11px] font-black transition-all cursor-pointer shadow-xs"
                title="複製您的專屬推薦連結"
              >
                {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? '已複製推薦碼' : '複製推薦碼'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsDismissed(true)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-amber-200/50 transition-colors cursor-pointer"
                title="暫時關閉公告"
                aria-label="關閉公告"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 流程步驟橫條（註冊送100點 -> 分享推薦碼+100點/人 -> 發布討論或痛點+100點 -> 刊登作品或創新提案+300點） */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-none select-none">
            {/* 步驟 1: 註冊送 100 點 */}
            <div
              onClick={() => {
                if (!isRegistered) openAuthModal('register', 'email');
              }}
              className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all ${
                isRegistered
                  ? 'bg-amber-100/70 border-amber-300/80 text-amber-950 cursor-default'
                  : 'bg-white hover:bg-amber-100/80 border-amber-200 text-stone-800 hover:border-amber-400 cursor-pointer active:scale-98 shadow-xs'
              }`}
              title={isRegistered ? '已領取註冊福利' : '點擊立即免費註冊領取 100 點'}
            >
              <div className="w-5 h-5 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
                <Gift className="w-3 h-3" />
              </div>
              <span className="text-[11px] sm:text-xs font-bold text-stone-700">註冊送</span>
              <span className="text-xs sm:text-sm font-black font-mono text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-md">
                100 點
              </span>
              {isRegistered && <Check className="w-3.5 h-3.5 text-amber-600 stroke-[3]" />}
            </div>

            {/* 箭頭 */}
            <ArrowRight className="w-3.5 h-3.5 text-amber-500/80 shrink-0 stroke-[2.5]" />

            {/* 步驟 2: 分享推薦碼+100點/人 */}
            <div
              onClick={handleCopyReferral}
              className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white hover:bg-amber-100/80 border border-amber-200 hover:border-amber-400 text-stone-800 cursor-pointer active:scale-98 transition-all shadow-xs"
              title="點擊複製您的推薦碼分享給朋友"
            >
              <div className="w-5 h-5 rounded-lg bg-orange-500 text-white flex items-center justify-center shrink-0">
                <Share2 className="w-3 h-3" />
              </div>
              <span className="text-[11px] sm:text-xs font-bold text-stone-700">分享推薦碼</span>
              <span className="text-xs sm:text-sm font-black font-mono text-orange-700 bg-orange-100 px-1.5 py-0.5 rounded-md">
                +100 點/人
              </span>
            </div>

            {/* 箭頭 */}
            <ArrowRight className="w-3.5 h-3.5 text-amber-500/80 shrink-0 stroke-[2.5]" />

            {/* 步驟 3: 發布討論或痛點+100點 */}
            <div className="relative shrink-0">
              <div
                onClick={() => {
                  setShowPublishDropdown(false);
                  setShowPostDropdown(!showPostDropdown);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white hover:bg-amber-100/80 border border-amber-200 hover:border-amber-400 text-stone-800 cursor-pointer active:scale-98 transition-all shadow-xs"
                title="點擊前往發布討論或提出痛點領取 100 點"
              >
                <div className="w-5 h-5 rounded-lg bg-rose-500 text-white flex items-center justify-center shrink-0">
                  <MessageSquare className="w-3 h-3" />
                </div>
                <span className="text-[11px] sm:text-xs font-bold text-stone-700">發布討論或痛點</span>
                <span className="text-xs sm:text-sm font-black font-mono text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded-md">
                  +100 點
                </span>
              </div>

              {/* 下拉選單：發布討論 vs. 提出痛點 */}
              {showPostDropdown && (
                <div className="absolute left-0 top-full mt-1 w-44 rounded-xl bg-white border border-stone-200 shadow-xl py-1 z-30 animate-in fade-in zoom-in-95">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPostDropdown(false);
                      onOpenCreatePainPoint();
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-bold text-stone-700 hover:bg-rose-50 hover:text-rose-700 flex items-center gap-2 cursor-pointer"
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span>提出生活或產業痛點</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPostDropdown(false);
                      onOpenCreateDiscussion();
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-bold text-stone-700 hover:bg-amber-50 hover:text-amber-800 flex items-center gap-2 cursor-pointer"
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>發布討論交流話題</span>
                  </button>
                </div>
              )}
            </div>

            {/* 箭頭 */}
            <ArrowRight className="w-3.5 h-3.5 text-amber-500/80 shrink-0 stroke-[2.5]" />

            {/* 步驟 4: 刊登作品或創新提案+300點 */}
            <div className="relative shrink-0">
              <div
                onClick={() => {
                  setShowPostDropdown(false);
                  setShowPublishDropdown(!showPublishDropdown);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-50 via-indigo-50 to-white hover:from-purple-100/80 hover:to-indigo-100/80 border border-purple-300 hover:border-purple-500 text-stone-900 cursor-pointer active:scale-98 transition-all shadow-xs"
                title="點擊刊登作品或創新提案賺取 +300 點"
              >
                <div className="w-5 h-5 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shrink-0">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                </div>
                <span className="text-[11px] sm:text-xs font-black text-purple-950">刊登作品或創新提案</span>
                <span className="text-xs sm:text-sm font-black font-mono text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded-md border border-purple-200">
                  +300 點 🚀
                </span>
              </div>

              {/* 下拉選單：刊登作品 vs. 創新提案 */}
              {showPublishDropdown && (
                <div className="absolute right-0 sm:left-0 top-full mt-1 w-48 rounded-xl bg-white border border-stone-200 shadow-xl py-1 z-30 animate-in fade-in zoom-in-95">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPublishDropdown(false);
                      onOpenCreateApp();
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-bold text-stone-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2 cursor-pointer"
                  >
                    <Globe className="w-3.5 h-3.5 text-indigo-600" />
                    <span>刊登軟體程式 / 網站作品</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPublishDropdown(false);
                      onOpenCreateProposal();
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-bold text-stone-700 hover:bg-amber-50 hover:text-amber-700 flex items-center gap-2 cursor-pointer"
                  >
                    <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                    <span>發布創新創業提案</span>
                  </button>
                </div>
              )}
            </div>

            {/* 箭頭 */}
            <ArrowRight className="w-3.5 h-3.5 text-amber-500/80 shrink-0 stroke-[2.5]" />

            {/* 持續上新中~ */}
            <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-100/90 via-pink-50 to-amber-100/90 border border-rose-300/80 text-rose-900 font-black text-[11px] sm:text-xs shadow-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
              <span>持續上新中~</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

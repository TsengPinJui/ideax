import React from 'react';
import {
  X,
  Sparkles,
  FilePlus,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Award,
  Coins,
  Send,
  Zap,
} from 'lucide-react';
import { User } from '../../types';

interface ChallengeRoleSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onSelectCreator: () => void;
  onSelectExpert: () => void;
}

export const ChallengeRoleSelectModal: React.FC<ChallengeRoleSelectModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSelectCreator,
  onSelectExpert,
}) => {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-stone-200 p-5 sm:p-6 space-y-5 animate-in zoom-in-95 duration-200 my-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-stone-950 flex items-center justify-center font-black shadow-xs">
              <Sparkles className="w-5 h-5 text-stone-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-stone-900">
                  請選擇您的創星季參賽身分
                </h3>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                歡迎 {currentUser.name}！請選擇以參賽者投稿或申請成為特聘專家
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl border border-stone-200 hover:bg-stone-100 flex items-center justify-center text-stone-500 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Informative Prompt */}
        <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200/80 text-xs text-stone-700 leading-relaxed">
          您已完成登入！依創星季競賽規定，請選擇您本次參與的角色管道。您可以隨時在兩種角色間體驗不同功能。
        </div>

        {/* 2 Big Action Cards: 參賽者 vs 成為專家 */}
        <div className="grid grid-cols-1 gap-3.5 pt-1">
          {/* Option A: 參賽者 (Contestant) */}
          <div
            onClick={() => {
              onClose();
              onSelectCreator();
            }}
            className="p-5 rounded-2xl bg-gradient-to-br from-amber-50/70 to-white border-2 border-amber-300 hover:border-amber-500 hover:shadow-md transition-all cursor-pointer group space-y-3 relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-400 text-stone-950 flex items-center justify-center font-black shrink-0 shadow-2xs">
                  <FilePlus className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-base text-stone-900 group-hover:text-amber-800 transition-colors">
                    💡 創新季參賽者（我要投稿）
                  </h4>
                  <span className="text-[11px] text-amber-700 font-bold block">
                    提出你的創新 Idea • 值得被市場看見
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                推薦首選
              </span>
            </div>

            <ul className="text-xs text-stone-600 space-y-1.5 pl-2">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>3 分鐘零門檻免費提交商業痛點與落地方案</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>獲得 100,000 點競賽專屬虛擬點數進行市場盲測</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>過審即頒發<strong>【官方金色榮譽數位證書】</strong>（唯一驗證號）</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>登錄創星榜，對接創投孵化與百大導師深度點評</span>
              </li>
            </ul>

            <button
              type="button"
              className="w-full py-2.5 rounded-xl bg-amber-400 group-hover:bg-amber-300 active:scale-98 text-stone-950 font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>以「參賽者」身分繼續投稿提案</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Option B: 成為專家 (Expert) */}
          <div
            onClick={() => {
              onClose();
              onSelectExpert();
            }}
            className="p-5 rounded-2xl bg-gradient-to-br from-purple-50/70 to-white border-2 border-purple-200 hover:border-purple-400 hover:shadow-md transition-all cursor-pointer group space-y-3 relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-purple-700 text-white flex items-center justify-center font-black shrink-0 shadow-2xs">
                  <ShieldCheck className="w-5 h-5 text-purple-200" />
                </div>
                <div>
                  <h4 className="font-black text-base text-stone-900 group-hover:text-purple-800 transition-colors">
                    🛡️ 成為特聘專家（加入評審團）
                  </h4>
                  <span className="text-[11px] text-purple-700 font-bold block">
                    專業指導注資 • 需上傳專業證件審核
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-200">
                專屬 $3,000,000
              </span>
            </div>

            <ul className="text-xs text-stone-600 space-y-1.5 pl-2">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span>獲配 <strong>$3,000,000 專屬支持金池</strong>（單案最高 $200 萬點）</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span>登錄官方認證評審顧問名冊，展示專業領域與資歷</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span><strong>需上傳相關證明或專業證件</strong>（名片/證照/在職證明）</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span>同步開通主站專業解題者（solver）商業諮詢權限</span>
              </li>
            </ul>

            <button
              type="button"
              className="w-full py-2.5 rounded-xl bg-purple-700 group-hover:bg-purple-600 active:scale-98 text-white font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>填寫資料並上傳證件成為專家</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-1 flex items-center justify-between text-[11px] text-stone-400">
          <span>主辦單位：IdeaX創點子團隊</span>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-500 hover:text-stone-800 font-bold underline cursor-pointer"
          >
            稍後再決定
          </button>
        </div>
      </div>
    </div>
  );
};

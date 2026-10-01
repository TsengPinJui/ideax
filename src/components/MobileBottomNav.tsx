import React from 'react';
import { Compass, GraduationCap, Plus, MessageCircle, User, Briefcase } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AppTab, UserDashboardTab } from '../types';

interface MobileBottomNavProps {
  activeTab: AppTab;
  userDashboardTab?: UserDashboardTab;
  onNavigate: (tab: AppTab) => void;
  onOpenCreateQuestion: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  userDashboardTab,
  onNavigate,
  onOpenCreateQuestion,
}) => {
  const {
    notifications,
    currentUser,
    unreadPersonalCount,
    pendingDisputesCount,
    isDemoMode,
    isNoPaymentMode,
    isHideTestAccounts,
  } = useApp();
  
  // 問卷未填寫提示紅點 (一般用戶未完成問卷或有待處理通知時顯示紅點)
  const isSurveyPending = !currentUser?.surveyData?.completedAt && currentUser?.role !== 'admin' && currentUser?.id !== 'user-guest';
  const showPersonalCenterRedDot = currentUser?.role === 'admin' ? pendingDisputesCount > 0 : (isSurveyPending || unreadPersonalCount > 0);

  const isExploreActive = activeTab === 'explore' || activeTab === 'question_detail';
  const isSolversActive = activeTab === 'solvers' || activeTab === 'solver_profile';
  const isMyProjectsActive = activeTab === 'my_projects' || (activeTab === 'user_dashboard' && userDashboardTab === 'proposals');
  const isDashboardActive = activeTab === 'user_dashboard' && userDashboardTab !== 'proposals';

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-stone-200/90 px-2 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] shadow-lg shadow-stone-950/10"
      aria-label="行動端底部快速導覽列"
    >
      <div className="grid grid-cols-5 items-center max-w-lg mx-auto">
        {/* 1. 探索問題 */}
        <button
          type="button"
          onClick={() => onNavigate('explore')}
          className={`flex flex-col items-center justify-center py-1 transition-all cursor-pointer ${
            isExploreActive
              ? 'text-amber-600 font-black'
              : 'text-stone-500 hover:text-stone-900 font-medium'
          }`}
        >
          <div className="relative">
            <Compass className={`w-5 h-5 transition-transform ${isExploreActive ? 'scale-110' : ''}`} />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">探索問題</span>
        </button>

        {/* 2. 找專家&榮譽榜 */}
        <button
          type="button"
          onClick={() => onNavigate('solvers')}
          className={`flex flex-col items-center justify-center py-1 transition-all cursor-pointer ${
            isSolversActive
              ? 'text-amber-600 font-black'
              : 'text-stone-500 hover:text-stone-900 font-medium'
          }`}
        >
          <div className="relative">
            <GraduationCap className={`w-5 h-5 transition-transform ${isSolversActive ? 'scale-110' : ''}`} />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">找專家&榮譽榜</span>
        </button>

        {/* 3. 中間凸出按鈕：發布懸賞/提問 */}
        <div className="flex items-center justify-center -mt-3.5">
          <button
            type="button"
            onClick={onOpenCreateQuestion}
            className="w-11 h-11 rounded-full bg-linear-to-tr from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 active:scale-95 text-stone-950 flex items-center justify-center shadow-md shadow-amber-500/30 ring-3 ring-white cursor-pointer transition-all"
            title="發布提問與痛點"
            aria-label="發布提問與痛點"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* 4. 我的案件 */}
        <button
          type="button"
          onClick={() => onNavigate('my_projects')}
          className={`flex flex-col items-center justify-center py-1 transition-all cursor-pointer relative ${
            isMyProjectsActive
              ? 'text-amber-600 font-black'
              : 'text-stone-500 hover:text-stone-900 font-medium'
          }`}
        >
          <div className="relative">
            <Briefcase className={`w-5 h-5 transition-transform ${isMyProjectsActive ? 'scale-110' : ''}`} />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">我的案件</span>
        </button>

        {/* 5. 個人中心 */}
        <button
          type="button"
          onClick={() => onNavigate('user_dashboard')}
          className={`flex flex-col items-center justify-center py-1 transition-all cursor-pointer relative ${
            isDashboardActive
              ? 'text-amber-600 font-black'
              : 'text-stone-500 hover:text-stone-900 font-medium'
          }`}
        >
          <div className="relative">
            {currentUser?.avatar && currentUser.avatar.trim() !== '' ? (
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className={`w-5 h-5 rounded-full object-cover ring-1 ${
                  isDashboardActive ? 'ring-amber-500' : 'ring-stone-300'
                }`}
              />
            ) : (
              <User className={`w-5 h-5 transition-transform ${isDashboardActive ? 'scale-110' : ''}`} />
            )}
            {showPersonalCenterRedDot && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white shadow-xs" />
            )}
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">個人中心</span>
        </button>
      </div>

      {/* 行動端頁尾版本號與日記模式 */}
      <div className="pt-1 mt-0.5 border-t border-stone-100 text-center font-mono text-[9.5px] text-stone-400 select-none tracking-tight">
        v1.4.0 • 2026.10.01 • {isDemoMode ? 'TEST' : isNoPaymentMode ? 'FREE' : 'NORM'}-{isHideTestAccounts ? 'HIDE' : 'SHOW'}
      </div>
    </nav>
  );
};

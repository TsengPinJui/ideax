import React from 'react';
import { Compass, GraduationCap, Plus, User, Briefcase } from 'lucide-react';
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
    promptLogin,
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
      data-ixm-avoid="bottom"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-t border-stone-200/80 px-2 py-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_-8px_rgba(0,0,0,0.06)]"
      aria-label="行動端底部快速導覽列"
    >
      <div className="grid grid-cols-5 items-center max-w-md mx-auto">
        {/* 1. 探索 */}
        <button
          type="button"
          onClick={() => onNavigate('explore')}
          className={`flex flex-col items-center justify-center py-1 transition-all cursor-pointer ${
            isExploreActive
              ? 'text-stone-950 font-black'
              : 'text-stone-400 hover:text-stone-800 font-medium'
          }`}
        >
          <Compass className={`w-5 h-5 transition-transform ${isExploreActive ? 'scale-105 text-amber-500 stroke-[2.2]' : ''}`} />
          <span className="text-[10px] mt-0.5 tracking-tight">探索</span>
        </button>

        {/* 2. 專家 */}
        <button
          id="onboarding-step-8-solvers"
          type="button"
          onClick={() => onNavigate('solvers')}
          className={`flex flex-col items-center justify-center py-1 transition-all cursor-pointer ${
            isSolversActive
              ? 'text-stone-950 font-black'
              : 'text-stone-400 hover:text-stone-800 font-medium'
          }`}
          title="找專家 & 榮譽榜"
        >
          <GraduationCap className={`w-5 h-5 transition-transform ${isSolversActive ? 'scale-105 text-amber-500 stroke-[2.2]' : ''}`} />
          <span className="text-[10px] mt-0.5 tracking-tight">專家</span>
        </button>

        {/* 3. 中間凸出按鈕：發布 */}
        <div id="onboarding-step-9-create" className="flex items-center justify-center -mt-3">
          <button
            type="button"
            onClick={() => {
              if (currentUser.id === 'user-guest') {
                promptLogin('訪客模式請先登入帳號以發布問題');
                return;
              }
              onOpenCreateQuestion();
            }}
            className="w-10 h-10 rounded-full bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 flex items-center justify-center shadow-md shadow-amber-500/25 ring-2 ring-white cursor-pointer transition-all"
            title="發布"
            aria-label="發布"
          >
            <Plus className="w-5 h-5 stroke-[2.6]" />
          </button>
        </div>

        {/* 4. 案件 */}
        <button
          type="button"
          onClick={() => {
            if (currentUser.id === 'user-guest') {
              promptLogin('訪客模式請先登入帳號以查看我的案件');
              return;
            }
            onNavigate('my_projects');
          }}
          className={`flex flex-col items-center justify-center py-1 transition-all cursor-pointer relative ${
            isMyProjectsActive
              ? 'text-stone-950 font-black'
              : 'text-stone-400 hover:text-stone-800 font-medium'
          }`}
        >
          <Briefcase className={`w-5 h-5 transition-transform ${isMyProjectsActive ? 'scale-105 text-amber-500 stroke-[2.2]' : ''}`} />
          <span className="text-[10px] mt-0.5 tracking-tight">案件</span>
        </button>

        {/* 5. 我的 */}
        <button
          id="onboarding-step-10-profile"
          type="button"
          onClick={() => {
            if (currentUser.id === 'user-guest') {
              promptLogin('訪客模式請先登入帳號以查看個人中心');
              return;
            }
            onNavigate('user_dashboard');
          }}
          className={`flex flex-col items-center justify-center py-1 transition-all cursor-pointer relative ${
            isDashboardActive
              ? 'text-stone-950 font-black'
              : 'text-stone-400 hover:text-stone-800 font-medium'
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
              <User className={`w-5 h-5 transition-transform ${isDashboardActive ? 'scale-105 text-amber-500 stroke-[2.2]' : ''}`} />
            )}
            {showPersonalCenterRedDot && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
            )}
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">我的</span>
        </button>
      </div>
    </nav>
  );
};

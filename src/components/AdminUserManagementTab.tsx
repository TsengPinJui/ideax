import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { User } from '../types';
import {
  UserCheck,
  ShieldAlert,
  Search,
  Filter,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  X,
  Calendar,
  Lock,
  Unlock,
  Sparkles,
  UserPlus,
  RefreshCw,
} from 'lucide-react';

export const AdminUserManagementTab: React.FC = () => {
  const {
    availableUsers,
    blockUser,
    unblockUser,
    currentUser,
    addTestAccount,
    purgeExpiredDeactivatedAccounts,
  } = useApp();

  const [activeFilter, setActiveFilter] = useState<'all' | 'normal' | 'blocked' | 'deactivated'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  // 一鍵生成測試帳號彈窗狀態
  const [isTestUserModalOpen, setIsTestUserModalOpen] = useState(false);
  const [testUserRole, setTestUserRole] = useState<'solver' | 'questioner' | 'admin'>('solver');
  const [testUserName, setTestUserName] = useState('');
  const [testUserTitle, setTestUserTitle] = useState('');
  const [testUserBalance, setTestUserBalance] = useState<number>(10000);
  const [testUserVerifiedExpert, setTestUserVerifiedExpert] = useState(true);

  // 封鎖彈窗狀態
  const [blockingTargetUser, setBlockingTargetUser] = useState<User | null>(null);
  const [blockDuration, setBlockDuration] = useState<number | 'permanent'>(7);
  const [blockReason, setBlockReason] = useState('');

  // 解封二次確認彈窗
  const [unblockingTargetUser, setUnblockingTargetUser] = useState<User | null>(null);

  const blockedUsers = availableUsers.filter((u) => u.isBlocked);
  const normalUsers = availableUsers.filter((u) => !u.isBlocked && !u.isDeactivated);
  const deactivatedUsers = availableUsers.filter((u) => u.isDeactivated || u.deactivationStatus === 'deactivated');

  const filteredUsers = availableUsers.filter((u) => {
    if (activeFilter === 'normal' && (u.isBlocked || u.isDeactivated)) return false;
    if (activeFilter === 'blocked' && !u.isBlocked) return false;
    if (activeFilter === 'deactivated' && !u.isDeactivated && u.deactivationStatus !== 'deactivated') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (u.name || '').toLowerCase().includes(q);
      const matchTitle = (u.title || '').toLowerCase().includes(q);
      const matchRole = (u.role || '').toLowerCase().includes(q);
      const matchId = (u.id || '').toLowerCase().includes(q);
      return matchName || matchTitle || matchRole || matchId;
    }
    return true;
  });

  const handleConfirmBlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockingTargetUser) return;
    if (!blockReason.trim()) {
      setFeedbackMsg({ text: '請填寫封鎖理由說明！', isError: true });
      return;
    }

    const res = blockUser(blockingTargetUser.id, blockDuration, blockReason.trim());
    if (res.success) {
      setFeedbackMsg({ text: res.message, isError: false });
      setBlockingTargetUser(null);
      setBlockReason('');
      setBlockDuration(7);
    } else {
      setFeedbackMsg({ text: res.message, isError: true });
    }
    setTimeout(() => setFeedbackMsg(null), 5000);
  };

  const handleConfirmUnblock = () => {
    if (!unblockingTargetUser) return;
    const res = unblockUser(unblockingTargetUser.id);
    if (res.success) {
      setFeedbackMsg({ text: res.message, isError: false });
      setUnblockingTargetUser(null);
    } else {
      setFeedbackMsg({ text: res.message, isError: true });
    }
    setTimeout(() => setFeedbackMsg(null), 5000);
  };

  const QUICK_REASONS = [
    '多次惡意洗版或發布垃圾資訊',
    '違反平台交易規範，私下繞過平台收費',
    '對其他用戶進行言語騷擾或人身攻擊',
    '交付不實成果或涉嫌詐騙',
    '帳號涉嫌異常登入與安全性風險',
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* 頂部訊息反饋 */}
      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 border animate-in fade-in ${
            feedbackMsg.isError
              ? 'bg-rose-50 text-rose-900 border-rose-200'
              : 'bg-emerald-50 text-emerald-900 border-emerald-200'
          }`}
        >
          {feedbackMsg.isError ? (
            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* 標題與說明 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-3.5">
        <div>
          <h3 className="text-base sm:text-lg font-black text-stone-900 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-purple-600" />
            <span>用戶管理</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-900">
              全站共 {availableUsers.length} 位用戶
            </span>
          </h3>
          <p className="text-xs text-stone-500 mt-1">
            管理員可執行帳號停權封鎖（設定封鎖時間與理由說明，系統自動發送平台通知），或為違規名單進行解封與審計。
          </p>
        </div>

        {/* 操作與統計群組 */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* 測試模式一鍵生成測試帳號按鈕 */}
          <button
            type="button"
            onClick={() => setIsTestUserModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:scale-95 text-stone-950 font-black text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            title="免註冊、免登入一鍵生成測試帳號"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>＋ 添加測試帳號</span>
          </button>

          {/* 清理到期註銷帳號 */}
          <button
            type="button"
            onClick={async () => {
              const purged = await purgeExpiredDeactivatedAccounts();
              setFeedbackMsg({
                text: purged > 0 ? `已成功正式註銷並清理 ${purged} 位屆滿 7 日之帳號！` : '目前無滿 7 日待正式註銷之帳號。',
                isError: false,
              });
              setTimeout(() => setFeedbackMsg(null), 4000);
            }}
            className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs border border-stone-200 transition-all flex items-center gap-1 cursor-pointer"
            title="檢查並批次執行滿 7 日反悔期之帳號正式註銷"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>到期註銷批次處理</span>
          </button>

          {/* 封鎖名單快速統計 Badge */}
          <span className={`text-xs font-black px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${
            blockedUsers.length > 0
              ? 'bg-rose-50 text-rose-900 border-rose-300'
              : 'bg-stone-50 text-stone-600 border-stone-200'
          }`}>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <span>停權封鎖：<strong>{blockedUsers.length}</strong></span>
          </span>
        </div>
      </div>

      {/* 篩選與搜尋列 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* 狀態切換按鈕 */}
        <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-2xl border border-stone-200 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-purple-700 text-white shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            全部用戶 ({availableUsers.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('normal')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'normal'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            正常狀態 ({normalUsers.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('blocked')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              activeFilter === 'blocked'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'text-rose-700 hover:bg-rose-50'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>封鎖名單 ({blockedUsers.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('deactivated')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              activeFilter === 'deactivated'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'text-amber-800 hover:bg-amber-50'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>註銷/反悔期 ({deactivatedUsers.length})</span>
          </button>
        </div>

        {/* 搜尋框 */}
        <div className="relative sm:w-64">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="搜尋用戶姓名、頭銜或身分..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:border-purple-500 outline-none"
          />
        </div>
      </div>

      {/* 用戶列表清單 */}
      <div className="space-y-3">
        {filteredUsers.length === 0 ? (
          <div className="p-10 text-center bg-stone-50 rounded-3xl border border-dashed border-stone-200 space-y-2">
            <UserCheck className="w-8 h-8 text-stone-300 mx-auto" />
            <p className="text-xs font-bold text-stone-600">無相符的用戶名單</p>
          </div>
        ) : (
          filteredUsers.map((u) => {
            const isSelf = u.id === currentUser.id;
            const isBlocked = Boolean(u.isBlocked);

            return (
              <div
                key={u.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                  isBlocked
                    ? 'bg-rose-50/50 border-rose-300 shadow-2xs ring-1 ring-rose-200'
                    : 'bg-white border-stone-200 hover:border-stone-300 shadow-2xs'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* 用戶主視覺資訊 */}
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                      alt={u.name}
                      className="w-12 h-12 rounded-2xl object-cover ring-2 ring-stone-200 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-black text-sm text-stone-900 truncate">{u.name}</h4>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            u.role === 'admin'
                              ? 'bg-purple-100 text-purple-900 border border-purple-300'
                              : u.role === 'solver'
                              ? 'bg-blue-100 text-blue-900 border border-blue-200'
                              : 'bg-amber-100 text-amber-900 border border-amber-200'
                          }`}
                        >
                          {u.role === 'admin' ? '👑 管理員' : u.role === 'solver' ? '💼 解答者' : '🙋 提問者'}
                        </span>

                        {isBlocked ? (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-rose-600 text-white flex items-center gap-1 shadow-2xs">
                            <Lock className="w-3 h-3" />
                            <span>已停權封鎖</span>
                          </span>
                        ) : u.deactivationStatus === 'deactivated' ? (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-stone-200 text-stone-700 border border-stone-300">
                            此帳號已註銷
                          </span>
                        ) : u.isDeactivated ? (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                            7日反悔猶豫期中
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                            正常使用中
                          </span>
                        )}

                        {isSelf && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-stone-100 text-stone-600">
                            目前登入本人
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-stone-500 truncate mt-0.5">
                        {u.title || '一般領域用戶'} · 帳號代碼：<span className="font-mono">{u.id}</span>
                      </p>

                      <div className="flex items-center gap-3 text-[11px] text-stone-400 mt-1">
                        <span>可用點數：<strong className="text-stone-700 font-mono">{(u.balance || 0).toLocaleString()}</strong></span>
                        <span>託管款項：<strong className="text-stone-700 font-mono">NT$ {(u.withheldPoints || 0).toLocaleString()}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* 動作按鈕 */}
                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    {isBlocked ? (
                      <button
                        type="button"
                        onClick={() => setUnblockingTargetUser(u)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        <span>解除封鎖</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setBlockingTargetUser(u);
                          setBlockReason('');
                          setBlockDuration(7);
                        }}
                        disabled={isSelf}
                        className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-black text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                        title={isSelf ? '無法封鎖目前登入的管理員本人' : '執行停權封鎖'}
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>封鎖帳號</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 封鎖詳細說明 (當用戶已被封鎖時展示) */}
                {isBlocked && (
                  <div className="mt-3.5 p-3 rounded-xl bg-white border border-rose-200 text-xs space-y-1.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-rose-900">
                      <span className="font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        <span>封鎖期限：<strong>{u.blockedUntil === 'permanent' ? '永久封鎖' : `${u.blockedUntil?.split('T')[0] || ''}（已自動發送平台系統通知）`}</strong></span>
                      </span>
                      <span className="text-stone-400">執行管理員：{u.blockedByAdminName || '平台管理員'} · 封鎖時間：{u.blockedAt?.split('T')[0] || '近期'}</span>
                    </div>
                    <div className="text-stone-700 bg-rose-50/50 p-2 rounded-lg leading-relaxed">
                      <strong>封鎖理由：</strong>{u.blockedReason || '違反創點子平台服務條款與使用者安全守則'}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 封鎖操作彈窗 */}
      {blockingTargetUser && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <ShieldAlert className="w-5 h-5" />
                <h4 className="font-black text-base text-stone-900">設定停權封鎖用戶帳號</h4>
              </div>
              <button
                type="button"
                onClick={() => setBlockingTargetUser(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 目標用戶簡要 */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-stone-50 border border-stone-200">
              <img
                src={blockingTargetUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                alt={blockingTargetUser.name}
                className="w-10 h-10 rounded-xl object-cover"
              />
              <div>
                <span className="font-black text-sm text-stone-900">{blockingTargetUser.name}</span>
                <span className="text-[11px] text-stone-500 block">{blockingTargetUser.title || '用戶'} ({blockingTargetUser.id})</span>
              </div>
            </div>

            <form onSubmit={handleConfirmBlock} className="space-y-4">
              {/* 1. 設定封鎖時間 */}
              <div>
                <label className="block text-xs font-black text-stone-800 mb-1.5">
                  1. 設定封鎖時間 <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: '1 天', val: 1 },
                    { label: '3 天', val: 3 },
                    { label: '7 天', val: 7 },
                    { label: '14 天', val: 14 },
                    { label: '30 天', val: 30 },
                    { label: '永久封鎖', val: 'permanent' as const },
                  ].map((item) => (
                    <button
                      key={String(item.val)}
                      type="button"
                      onClick={() => setBlockDuration(item.val)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                        blockDuration === item.val
                          ? 'bg-rose-600 text-white border-rose-600 font-black shadow-2xs'
                          : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. 說明封鎖理由 */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-black text-stone-800">
                    2. 說明封鎖理由（將以平台系統通知通知該用戶） <span className="text-rose-500">*</span>
                  </label>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-2">
                  {QUICK_REASONS.slice(0, 3).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setBlockReason(r)}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-stone-100 hover:bg-rose-50 hover:text-rose-800 text-stone-600 border border-stone-200 transition-colors cursor-pointer"
                    >
                      帶入：{r}
                    </button>
                  ))}
                </div>

                <textarea
                  required
                  rows={3}
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="請清楚填寫封鎖理由說明，此理由將於確認後立即發送「平台通知」寄達給該用戶..."
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:border-rose-500 outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 leading-relaxed font-semibold">
                ⚠️ 提示：確認封鎖後，該用戶帳號將無法發布問題、提交方案、發送私訊或進行金流交易，且系統會即刻發送官方平台通知告知停權期限與理由。
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setBlockingTargetUser(null)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-stone-600 hover:bg-stone-50 text-xs font-bold cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-xs transition-all cursor-pointer"
                >
                  確認執行封鎖並發送平台通知
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 一鍵生成測試帳號彈窗 */}
      {isTestUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2 text-amber-600">
                <Sparkles className="w-5 h-5" />
                <h4 className="font-black text-base text-stone-900">一鍵添加測試帳號（免註冊免登入）</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsTestUserModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  1. 選擇測試身分角色
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['solver', 'questioner', 'admin'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setTestUserRole(r)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                        testUserRole === r
                          ? r === 'admin'
                            ? 'bg-purple-700 text-white shadow-2xs font-black'
                            : r === 'solver'
                            ? 'bg-blue-600 text-white shadow-2xs font-black'
                            : 'bg-amber-500 text-stone-950 shadow-2xs font-black'
                          : 'bg-stone-50 border border-stone-200 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      {r === 'admin' ? '👑 管理員' : r === 'solver' ? '💼 解答專家' : '🙋 提問者'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  2. 測試名稱（選填，留空自動亂數產生）
                </label>
                <input
                  type="text"
                  value={testUserName}
                  onChange={(e) => setTestUserName(e.target.value)}
                  placeholder="例如：AI產品策略總監 測試帳號"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  3. 專業職稱 / 簡述（選填）
                </label>
                <input
                  type="text"
                  value={testUserTitle}
                  onChange={(e) => setTestUserTitle(e.target.value)}
                  placeholder="例如：資深架構師 / 新創連續創業者"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:border-amber-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    4. 初始點數 / 餘額
                  </label>
                  <input
                    type="number"
                    value={testUserBalance}
                    onChange={(e) => setTestUserBalance(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-bold focus:bg-white focus:border-amber-500 outline-none"
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 p-2 bg-stone-50 border border-stone-200 rounded-xl cursor-pointer text-xs font-bold text-stone-800">
                    <input
                      type="checkbox"
                      checked={testUserVerifiedExpert}
                      onChange={(e) => setTestUserVerifiedExpert(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span>具認證專家標章</span>
                  </label>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 leading-relaxed font-medium">
                💡 測試環境特權：此帳號免註冊、免密碼、免信箱驗證，建立後將直接加載至系統並可於全站快速切換使用！
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setIsTestUserModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-stone-300 text-stone-600 hover:bg-stone-50 text-xs font-bold cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  const created = addTestAccount({
                    role: testUserRole,
                    name: testUserName.trim() || undefined,
                    title: testUserTitle.trim() || undefined,
                    balance: testUserBalance,
                    verifiedExpert: testUserVerifiedExpert,
                    autoSwitch: false,
                  });
                  setIsTestUserModalOpen(false);
                  setTestUserName('');
                  setTestUserTitle('');
                  setFeedbackMsg({
                    text: `已成功生成測試帳號「${created.name}」(${created.role === 'admin' ? '管理員' : created.role === 'solver' ? '專家' : '提問者'})！`,
                    isError: false,
                  });
                  setTimeout(() => setFeedbackMsg(null), 4000);
                }}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-stone-950 text-xs font-black shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>立即建立測試帳號</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 解除封鎖二次確認彈窗 */}
      {unblockingTargetUser && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-stone-200">
            <div className="flex items-center gap-2.5 text-emerald-600">
              <Unlock className="w-6 h-6" />
              <h4 className="font-black text-base text-stone-900">確認解除用戶封鎖？</h4>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              您確定要為用戶<strong>「{unblockingTargetUser.name}」</strong>解除停權封鎖嗎？解除後將恢復正常發布問題、提交方案與各項權限，系統將自動以平台通知通知該用戶。
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setUnblockingTargetUser(null)}
                className="px-4 py-2 rounded-xl border border-stone-300 text-stone-600 hover:bg-stone-50 text-xs font-bold cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmUnblock}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-xs transition-all cursor-pointer"
              >
                確認解除封鎖
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

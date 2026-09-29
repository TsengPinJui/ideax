import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { User } from '../types';
import {
  Coins,
  Building2,
  Search,
  User as UserIcon,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Plus,
  Minus,
  Edit3,
} from 'lucide-react';

export const AdminPointsReceivablesTab: React.FC = () => {
  const { availableUsers, adjustUserBalance, currentUser } = useApp();

  const [selectedUserId, setSelectedUserId] = useState<string>(availableUsers[0]?.id || 'user-1');
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [deltaPoints, setDeltaPoints] = useState<number>(500);
  const [isAdding, setIsAdding] = useState(true);
  const [adjustReason, setAdjustReason] = useState('管理員手動核發活動體驗金');
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  const selectedUser = availableUsers.find((u) => u.id === selectedUserId) || availableUsers[0];

  const filteredUsers = availableUsers.filter((u) => {
    if (!searchUserQuery.trim()) return true;
    const q = searchUserQuery.toLowerCase();
    return (
      (u.name || '').toLowerCase().includes(q) ||
      (u.title || '').toLowerCase().includes(q) ||
      (u.id || '').toLowerCase().includes(q)
    );
  });

  const handleAdjustBalance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (deltaPoints <= 0) {
      setFeedbackMsg({ text: '調整點數必須大於 0！', isError: true });
      return;
    }
    if (!adjustReason.trim()) {
      setFeedbackMsg({ text: '請輸入調整點數之原因備註！', isError: true });
      return;
    }

    const finalDelta = isAdding ? deltaPoints : -deltaPoints;
    const success = adjustUserBalance(selectedUser.id, finalDelta, adjustReason.trim());
    if (success) {
      setFeedbackMsg({
        text: `🎉 已成功為「${selectedUser.name}」${isAdding ? '增加' : '扣除'} ${deltaPoints.toLocaleString()} 點！系統已寫入帳務審計日誌並發送通知。`,
        isError: false,
      });
      setAdjustReason('管理員手動調整點數');
    } else {
      setFeedbackMsg({ text: '調整點數失敗，請重試。', isError: true });
    }
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 訊息反饋提示 */}
      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 border animate-in fade-in ${
            feedbackMsg.isError
              ? 'bg-rose-50 text-rose-900 border-rose-200'
              : 'bg-emerald-50 text-emerald-900 border-emerald-200'
          }`}
        >
          {feedbackMsg.isError ? (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* 頂部標題 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-3.5">
        <div>
          <h3 className="text-base sm:text-lg font-black text-stone-900 flex items-center gap-2">
            <Coins className="w-5 h-5 text-purple-600" />
            <span>點數 & 應收帳款管理</span>
          </h3>
          <p className="text-xs text-stone-500 mt-1">
            管理者可在此查閱全站個別用戶之帳目狀態（點數餘額、第三方應收帳款、累計撥款與銀行帳戶），並執行帳務調整。
          </p>
        </div>
      </div>

      {/* 查閱個別用戶選擇器 */}
      <div className="p-4 sm:p-5 rounded-2xl bg-purple-50/60 border border-purple-200 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <label className="text-xs font-black text-purple-950 flex items-center gap-1.5">
            <UserIcon className="w-4 h-4 text-purple-700" />
            <span>選擇查閱之個別用戶帳目：</span>
          </label>
          <div className="relative sm:w-60">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="搜尋用戶姓名..."
              value={searchUserQuery}
              onChange={(e) => setSearchUserQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1 bg-white border border-purple-200 rounded-xl text-xs focus:outline-none focus:border-purple-600"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {filteredUsers.slice(0, 8).map((u) => {
            const isSelected = u.id === selectedUserId;
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => setSelectedUserId(u.id)}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                  isSelected
                    ? 'bg-purple-700 text-white border-purple-700 shadow-2xs font-bold'
                    : 'bg-white text-stone-800 border-stone-200 hover:border-purple-300 hover:bg-white'
                }`}
              >
                <img src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'} alt="" className="w-7 h-7 rounded-lg object-cover ring-1 ring-white/50 shrink-0" />
                <div className="min-w-0">
                  <span className="block text-xs font-bold truncate">{u.name}</span>
                  <span className={`text-[10px] block truncate ${isSelected ? 'text-purple-200' : 'text-stone-400'}`}>
                    {(u.balance || 0).toLocaleString()} 點
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 選定用戶帳目明細儀表盤 */}
      {selectedUser && (
        <div className="space-y-4">
          <div className="p-5 rounded-3xl bg-white border border-stone-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-3">
                <img
                  src={selectedUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                  alt={selectedUser.name}
                  className="w-12 h-12 rounded-2xl object-cover ring-2 ring-stone-200"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-base text-stone-900">{selectedUser.name}</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-800">
                      {selectedUser.role === 'admin' ? '管理員' : selectedUser.role === 'solver' ? '解答者' : '提問者'}
                    </span>
                    {selectedUser.isBlocked && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-rose-600 text-white">
                        已封鎖
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">{selectedUser.title || '領域用戶'} · 帳號：{selectedUser.id}</p>
                </div>
              </div>
            </div>

            {/* 個別用戶 4 大帳務指標 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200">
                <span className="text-xs font-bold text-amber-900 block">可用點數餘額</span>
                <span className="text-2xl font-black text-amber-950 font-mono mt-1 block">
                  {(selectedUser.balance || 0).toLocaleString()} <span className="text-xs font-normal">點</span>
                </span>
                <span className="text-[10px] text-amber-800 mt-0.5 block">可於提問懸賞中隨時抵用</span>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200">
                <span className="text-xs font-bold text-blue-900 block">應收帳款（第三方託管中）</span>
                <span className="text-2xl font-black text-blue-950 font-mono mt-1 block">
                  NT$ {(selectedUser.withheldPoints || 0).toLocaleString()}
                </span>
                <span className="text-[10px] text-blue-800 mt-0.5 block">待提問方驗收後自動拆款入帳</span>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                <span className="text-xs font-bold text-emerald-900 block">累計已撥款出金</span>
                <span className="text-2xl font-black text-emerald-950 font-mono mt-1 block">
                  NT$ {(selectedUser.totalPaidOut || selectedUser.totalWithdrawn || 0).toLocaleString()}
                </span>
                <span className="text-[10px] text-emerald-800 mt-0.5 block">歷史直撥銀行累計總額</span>
              </div>
            </div>

            {/* 綁定銀行帳戶資訊 */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-stone-600" />
                <h5 className="font-extrabold text-xs text-stone-900">該用戶綁定的收款銀行帳戶</h5>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-white border border-stone-200">
                  <span className="text-[10px] text-stone-400 block">銀行名稱</span>
                  <span className="font-bold text-stone-800">{selectedUser.bankAccount?.bankName || '822 中國信託商業銀行'}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-stone-200">
                  <span className="text-[10px] text-stone-400 block">銀行代碼</span>
                  <span className="font-mono font-bold text-stone-800">{selectedUser.bankAccount?.bankCode || '822'}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-stone-200">
                  <span className="text-[10px] text-stone-400 block">帳戶號碼</span>
                  <span className="font-mono font-bold text-stone-800">
                    {selectedUser.bankAccount?.accountNumber ? `•••• ${selectedUser.bankAccount.accountNumber.slice(-4)}` : '•••• 6789'}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-stone-200">
                  <span className="text-[10px] text-stone-400 block">戶名</span>
                  <span className="font-bold text-stone-800">{selectedUser.bankAccount?.accountHolder || selectedUser.name}</span>
                </div>
              </div>
            </div>

            {/* 管理員手動調整該用戶點數工具 */}
            <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200 space-y-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-purple-700" />
                <h5 className="font-extrabold text-xs text-purple-950">
                  管理員手動調整點數餘額（直接入帳 / 扣除）
                </h5>
              </div>

              <form onSubmit={handleAdjustBalance} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-stone-700 block mb-1">操作類型</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsAdding(true)}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-1 cursor-pointer ${
                          isAdding
                            ? 'bg-emerald-600 text-white border-emerald-600 font-black shadow-2xs'
                            : 'bg-white text-stone-600 border-stone-200'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>增加點數</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAdding(false)}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-1 cursor-pointer ${
                          !isAdding
                            ? 'bg-rose-600 text-white border-rose-600 font-black shadow-2xs'
                            : 'bg-white text-stone-600 border-stone-200'
                        }`}
                      >
                        <Minus className="w-3.5 h-3.5" />
                        <span>扣除點數</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-stone-700 block mb-1">調整點數額度 *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      step={50}
                      value={deltaPoints}
                      onChange={(e) => setDeltaPoints(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-xl text-xs font-mono font-bold text-stone-900 focus:border-purple-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-stone-700 block mb-1">調整原因備註（寄發通知） *</label>
                    <input
                      type="text"
                      required
                      value={adjustReason}
                      onChange={(e) => setAdjustReason(e.target.value)}
                      placeholder="例如：平台官方補償點數、特別榮譽獎勵"
                      className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 focus:border-purple-600 outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-black text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>確認執行點數調整並通知用戶</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

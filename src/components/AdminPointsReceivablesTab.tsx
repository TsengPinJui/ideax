import React, { useState } from 'react';
import { formatDateTime } from '../utils/formatDateTime';
import { useApp } from '../context/AppContext';
import {
  Coins,
  Send,
  Building2,
  Search,
  User as UserIcon,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Plus,
  Minus,
  Sparkles,
  ShieldCheck,
  Clock,
  History,
} from 'lucide-react';

export const AdminPointsReceivablesTab: React.FC = () => {
  const {
    currentUser,
    availableUsers,
    adminDailyQuota,
    getAdminRemainingDailyQuota,
    adminTransferPoints,
    transactions,
  } = useApp();

  const remainingQuota = getAdminRemainingDailyQuota(currentUser.id);
  const usedQuota = Math.max(0, adminDailyQuota - remainingQuota);
  const quotaPercent = Math.min(100, Math.round((usedQuota / adminDailyQuota) * 100));

  const [selectedUserId, setSelectedUserId] = useState<string>(
    availableUsers.find((u) => u.id !== currentUser.id)?.id || availableUsers[0]?.id || ''
  );
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [amount, setAmount] = useState<number>(1000);
  const [reasonCategory, setReasonCategory] = useState<string>('活動獎勵發放');
  const [customReasonNote, setCustomReasonNote] = useState<string>('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; isError?: boolean } | null>(null);
  const [isConfirming, setIsConfirming] = useState<boolean>(false);

  const selectedUser = availableUsers.find((u) => u.id === selectedUserId) || availableUsers[0];

  const filteredUsers = availableUsers.filter((u) => {
    if (!searchUserQuery.trim()) return true;
    const q = searchUserQuery.toLowerCase();
    return (
      (u.name || '').toLowerCase().includes(q) ||
      (u.title || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.id || '').toLowerCase().includes(q)
    );
  });

  const PRESET_AMOUNTS = [500, 1000, 3000, 5000, 10000, 20000];

  const PRESET_REASONS = [
    '活動獎勵發放',
    '新用戶體驗金',
    '優質解答激勵',
    '系統維護補償',
    '合作贊助撥付',
  ];

  // Transfer history
  const historyTransactions = transactions.filter(
    (tx) =>
      tx.type === '管理員轉入點數' ||
      tx.note?.includes('【管理員點數轉入】') ||
      tx.note?.includes('管理員手動') ||
      tx.fromUserName?.includes('管理')
  );

  const handleExecute = () => {
    if (!selectedUser) {
      setFeedbackMsg({ text: '請選擇受款用戶！', isError: true });
      return;
    }
    if (amount <= 0) {
      setFeedbackMsg({ text: '點數金額必須大於 0！', isError: true });
      return;
    }

    const fullReason = customReasonNote.trim()
      ? `${reasonCategory} - ${customReasonNote.trim()}`
      : reasonCategory;

    if (amount > remainingQuota) {
      setFeedbackMsg({
        text: `轉入點數 (${amount.toLocaleString()}) 超出今日剩餘配額 (${remainingQuota.toLocaleString()})！`,
        isError: true,
      });
      return;
    }
    const res = adminTransferPoints(selectedUser.id, amount, fullReason);
    if (res.success) {
      setFeedbackMsg({ text: res.message, isError: false });
      setCustomReasonNote('');
    } else {
      setFeedbackMsg({ text: res.message, isError: true });
    }

    setIsConfirming(false);
    setTimeout(() => setFeedbackMsg(null), 5000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 訊息反饋提示 */}
      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 border animate-in fade-in ${
            feedbackMsg.isError
              ? 'bg-rose-50 text-rose-900 border-stone-200'
              : 'bg-emerald-50 text-emerald-900 border-stone-200'
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

      {/* 頂部標題與說明 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-3.5">
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-stone-900 flex items-center gap-2 flex-wrap">
            <Coins className="w-5 h-5 text-purple-600" />
            <span>點數與帳務管理</span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-stone-200">
              每日撥付配額 {adminDailyQuota.toLocaleString()} 點
            </span>
          </h3>
          <p className="text-xs text-stone-500 mt-1">
            查閱全站用戶帳目、點數餘額與應收撥款，並執行管理員點數轉入與活動激勵發放。
          </p>
        </div>
        <div className="text-right shrink-0">
          <span className="text-[11px] text-stone-400 block tabular-nums">今日剩餘可轉配額</span>
          <span className="text-base font-semibold text-amber-700 tabular-nums">
            {remainingQuota.toLocaleString()} <span className="text-xs font-normal">點</span>
          </span>
        </div>
      </div>

      {/* 查閱個別用戶選擇器 */}
      <div className="p-4 sm:p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <label className="text-xs font-semibold text-purple-950 flex items-center gap-1.5">
            <UserIcon className="w-4 h-4 text-purple-700" />
            <span>選擇受款 / 查閱之會員用戶：</span>
          </label>
          <div className="relative sm:w-64">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="搜尋用戶姓名、Email、職稱..."
              value={searchUserQuery}
              onChange={(e) => setSearchUserQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1 bg-white border border-stone-200 rounded-xl text-xs focus:outline-none focus:border-purple-600"
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
                    : 'bg-white text-stone-800 border-stone-200 hover:border-stone-200 hover:bg-white'
                }`}
              >
                <img
                  src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                  alt=""
                  className="w-7 h-7 rounded-lg object-cover ring-1 ring-white/50 shrink-0"
                />
                <div className="min-w-0">
                  <span className="block text-xs font-bold truncate">{u.name}</span>
                  <span className={`text-[11px] block truncate ${isSelected ? 'text-purple-200' : 'text-stone-400'}`}>
                    {(u.role === 'admin' ? remainingQuota : (u.balance || 0)).toLocaleString()} 點
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 選定用戶帳目明細與調度面板 */}
      {selectedUser && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-4">
            {/* 用戶身分抬頭 */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <img
                  src={selectedUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                  alt=""
                  className="w-10 h-10 rounded-xl object-cover ring-2 ring-purple-100"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-sm text-stone-900">{selectedUser.name}</h4>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 font-bold">
                      {selectedUser.role === 'admin' ? '超級管理員' : selectedUser.role === 'solver' ? '認證專家' : '提問者'}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">{selectedUser.email || '未提供電子郵件'}</p>
                </div>
              </div>
              <span className="text-xs text-stone-400 tabular-nums">ID: {selectedUser.id}</span>
            </div>

            {/* 用戶 3 大帳務指標 (多格面板) */}
            <div className="grid grid-cols-1 xs:grid-cols-3 sm:grid-cols-3 gap-2.5 sm:gap-3.5">
              <div className="p-3.5 sm:p-4 rounded-2xl bg-stone-50 border border-stone-200">
                <span className="text-xs font-bold text-amber-900 block truncate">
                  {selectedUser.role === 'admin' ? '今日剩餘可撥配額' : '可用點數餘額'}
                </span>
                <span className="text-xl sm:text-2xl font-semibold text-amber-950 tabular-nums mt-1 block">
                  {(selectedUser.role === 'admin' ? remainingQuota : (selectedUser.balance || 0)).toLocaleString()} <span className="text-xs font-normal">點</span>
                </span>
                <span className="text-[11px] text-amber-800 mt-0.5 block truncate">
                  {selectedUser.role === 'admin' ? '每日上限 50,000 點' : '發布懸賞隨時抵用'}
                </span>
              </div>

              <div className="p-3.5 sm:p-4 rounded-2xl bg-stone-50 border border-stone-200">
                <span className="text-xs font-bold text-blue-900 block truncate">應收帳款（託管）</span>
                <span className="text-xl sm:text-2xl font-semibold text-blue-950 tabular-nums mt-1 block">
                  NT$ {(selectedUser.withheldPoints || 0).toLocaleString()}
                </span>
                <span className="text-[11px] text-blue-800 mt-0.5 block truncate">驗收後自動撥付</span>
              </div>

              <div className="p-3.5 sm:p-4 rounded-2xl bg-stone-50 border border-stone-200">
                <span className="text-xs font-bold text-emerald-900 block truncate">累計已撥款出金</span>
                <span className="text-xl sm:text-2xl font-semibold text-emerald-950 tabular-nums mt-1 block">
                  NT$ {(selectedUser.totalPaidOut || 0).toLocaleString()}
                </span>
                <span className="text-[11px] text-emerald-800 mt-0.5 block truncate">歷史直撥累計總額</span>
              </div>
            </div>

            {/* 綁定銀行帳戶資訊 */}
            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-1.5">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-stone-600" />
                <h5 className="font-semibold text-xs text-stone-900">該用戶綁定之直撥收款銀行帳戶</h5>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2 rounded-xl bg-white border border-stone-200">
                  <span className="text-[11px] text-stone-400 block">銀行名稱</span>
                  <span className="font-bold text-stone-800 truncate block">
                    {selectedUser.bankAccount?.bankName || '未設定'}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-white border border-stone-200">
                  <span className="text-[11px] text-stone-400 block">銀行代碼</span>
                  <span className="tabular-nums font-bold text-stone-800">
                    {selectedUser.bankAccount?.bankCode || '—'}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-white border border-stone-200">
                  <span className="text-[11px] text-stone-400 block">帳戶號碼</span>
                  <span className="tabular-nums font-bold text-stone-800">
                    {selectedUser.bankAccount?.accountNumber
                      ? `•••• ${selectedUser.bankAccount.accountNumber.slice(-4)}`
                      : '未設定'}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-white border border-stone-200">
                  <span className="text-[11px] text-stone-400 block">戶名</span>
                  <span className="font-bold text-stone-800 truncate block">
                    {selectedUser.bankAccount?.accountHolder || '未設定'}
                  </span>
                </div>
              </div>
            </div>

            {/* 點數轉入操作區 */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-stone-900 to-stone-950 text-white space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-sm text-stone-100">點數轉入</span>
                </div>
                <div className="text-xs text-amber-400 tabular-nums bg-stone-850 px-2.5 py-1 rounded-lg border border-stone-800">
                  今日剩餘配額：{remainingQuota.toLocaleString()} 點
                </div>
              </div>

              {/* 點數金額快選與自訂 */}
              <div className="space-y-2">
                <label className="text-xs text-stone-300 font-bold flex items-center justify-between">
                  <span>轉入點數金額：</span>
                  <span className="text-[11px] text-stone-400 tabular-nums">
                    上限：{remainingQuota.toLocaleString()} 點
                  </span>
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {PRESET_AMOUNTS.map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAmount(val)}
                      className={`py-1.5 px-2 rounded-xl text-xs tabular-nums font-bold transition-all cursor-pointer ${
                        amount === val
                          ? 'bg-amber-400 text-stone-950 font-semibold shadow-xs'
                          : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
                      }`}
                    >
                      {val.toLocaleString()} 點
                    </button>
                  ))}
                </div>
                <div className="relative mt-2">
                  <input
                    type="number"
                    min={1}
                    value={amount || ''}
                    onChange={(e) => setAmount(Math.max(0, parseInt(e.target.value) || 0))}
                    placeholder="自訂點數金額..."
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-white tabular-nums text-sm focus:outline-none focus:border-amber-400"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">點數</span>
                </div>
              </div>

              {/* 原因選擇與備註 */}
              <div className="space-y-2">
                <label className="text-xs text-stone-300 font-bold">轉入原因分類與備註：</label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_REASONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setReasonCategory(r)}
                      className={`px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                        reasonCategory === r
                          ? 'bg-purple-500 text-white font-bold'
                          : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="補充說明備註（可選填，例如：9月專家優質解題激勵金）..."
                  value={customReasonNote}
                  onChange={(e) => setCustomReasonNote(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* 執行按鈕 */}
              <div className="pt-2 flex items-center justify-between border-t border-stone-800 flex-wrap gap-2">
                <div className="text-xs text-stone-400">
                  受款對象：<strong className="text-white">{selectedUser.name}</strong> • 轉入點數：
                  <strong className="text-amber-400">
                    +{amount.toLocaleString()} 點
                  </strong>
                </div>
                <button
                  type="button"
                  onClick={() => setIsConfirming(true)}
                  disabled={amount <= 0 || amount > remainingQuota}
                  className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 disabled:opacity-50 disabled:pointer-events-none text-stone-950 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Send className="w-3.5 h-3.5 text-stone-950" />
                  <span>確認轉入點數</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 最近點數轉入紀錄 */}
      <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-purple-600" />
            <h4 className="font-semibold text-sm text-stone-900">最近點數轉入紀錄</h4>
          </div>
          <span className="text-[11px] text-stone-400 tabular-nums">共 {historyTransactions.length} 筆</span>
        </div>

        {historyTransactions.length === 0 ? (
          <div className="py-8 text-center text-xs text-stone-400">尚無點數轉入紀錄</div>
        ) : (
          <div className="divide-y divide-stone-100">
            {historyTransactions.slice(0, 6).map((tx) => (
              <div key={tx.id} className="py-2.5 flex items-center justify-between text-xs gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-stone-900 truncate">
                      撥至：{tx.toUserName || '會員用戶'}
                    </span>
                    <span className="text-[11px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 tabular-nums">
                      {tx.type}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 truncate mt-0.5">{tx.note || '管理員點數異動'}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-semibold text-amber-700 tabular-nums block">
                    +{tx.amount?.toLocaleString()} 點
                  </span>
                  <span className="text-[11px] text-stone-400 tabular-nums">{formatDateTime(tx.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 確認彈窗 */}
      {isConfirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-stone-200">
            <div className="flex items-center gap-2.5 text-amber-700">
              <ShieldCheck className="w-5 h-5 text-amber-600" />
              <h4 className="font-semibold text-sm text-stone-900">確認轉入點數？</h4>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              即將為「<strong>{selectedUser?.name}</strong>」轉入
              <strong className="text-amber-700 text-sm tabular-nums"> +{amount.toLocaleString()} 點</strong>。
              <br />
              原因備註：{customReasonNote.trim() ? `${reasonCategory} - ${customReasonNote.trim()}` : reasonCategory}。
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setIsConfirming(false)}
                className="px-3.5 py-1.5 rounded-xl border border-stone-200 text-stone-700 text-xs font-bold hover:bg-stone-100 cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleExecute}
                className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-semibold cursor-pointer shadow-xs"
              >
                確定轉入
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { User, Transaction } from '../types';
import {
  Send,
  Coins,
  ShieldCheck,
  AlertCircle,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  User as UserIcon,
  HelpCircle,
  History,
  Lock,
  RefreshCw,
} from 'lucide-react';

export const AdminTransferPointsTab: React.FC = () => {
  const {
    currentUser,
    availableUsers,
    adminDailyQuota,
    getAdminRemainingDailyQuota,
    adminTransferPoints,
    adminResetDailyPoints,
    transactions,
  } = useApp();

  const remainingQuota = getAdminRemainingDailyQuota(currentUser.id);
  const usedQuota = Math.max(0, adminDailyQuota - remainingQuota);
  const quotaPercent = Math.min(100, Math.round((usedQuota / adminDailyQuota) * 100));

  const [selectedUserId, setSelectedUserId] = useState<string>(
    availableUsers.find((u) => u.id !== currentUser.id)?.id || availableUsers[0]?.id || ''
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [transferAmount, setTransferAmount] = useState<number>(1000);
  const [reasonCategory, setReasonCategory] = useState<string>('活動獎勵發放');
  const [customReasonNote, setCustomReasonNote] = useState<string>('');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [resultMsg, setResultMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  const selectedUser = availableUsers.find((u) => u.id === selectedUserId);

  const filteredUsers = availableUsers.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (u.name || '').toLowerCase().includes(q) ||
      (u.title || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.id || '').toLowerCase().includes(q)
    );
  });

  // Filter transfer transaction history
  const grantHistory = transactions.filter(
    (tx) => tx.note?.includes('【管理員點數轉入】') || tx.note?.includes('管理員手動') || tx.fromUserName?.includes('管理')
  );

  const PRESET_AMOUNTS = [500, 1000, 3000, 5000, 10000, 20000];

  const PRESET_REASONS = [
    '活動獎勵發放',
    '新用戶註冊體驗金補發',
    '優質解答與專家激勵金',
    '系統升級維護補償',
    '線下社群合作與贊助',
    '其他業務審計調度',
  ];

  const handleExecuteTransfer = () => {
    if (!selectedUser) {
      setResultMsg({ text: '請選擇受款用戶！', isError: true });
      return;
    }
    if (transferAmount <= 0) {
      setResultMsg({ text: '轉入點數必須大於 0！', isError: true });
      return;
    }
    if (transferAmount > remainingQuota) {
      setResultMsg({
        text: `轉入點數 (${transferAmount.toLocaleString()}) 超出今日剩餘配額 (${remainingQuota.toLocaleString()})！`,
        isError: true,
      });
      return;
    }

    const fullReason = customReasonNote.trim()
      ? `${reasonCategory} - ${customReasonNote.trim()}`
      : reasonCategory;

    const res = adminTransferPoints(selectedUser.id, transferAmount, fullReason);
    setIsConfirmModalOpen(false);

    if (res.success) {
      setResultMsg({ text: res.message, isError: false });
      setCustomReasonNote('');
      setTimeout(() => setResultMsg(null), 5000);
    } else {
      setResultMsg({ text: res.message, isError: true });
    }
  };

  return (
    <div className="space-y-6">
      {/* 標題與說明 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center font-black shrink-0 shadow-2xs">
              <Send className="w-5 h-5 text-purple-700" />
            </div>
            <div>
              <h3 className="text-lg font-black text-stone-900 flex items-center gap-2 flex-wrap">
                <span>管理員轉入點數</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-200 font-extrabold">
                  每日配額 50,000 點
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 font-bold">
                  每日 00:00 自動歸零並重製
                </span>
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                為指定會員帳戶即時撥付點數，用於官方活動激勵、專案補償或合作贊助，所有轉入皆受每日上限熔斷保護並寫入審計帳本。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 每日配額看板 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 卡片 1: 今日剩餘額度 */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-purple-900 to-indigo-950 text-white shadow-md relative overflow-hidden">
          <div className="absolute right-[-10px] top-[-10px] opacity-10">
            <Coins className="w-28 h-28 text-white" />
          </div>
          <div className="relative z-10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-purple-200 font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                今日剩餘可轉額度
              </span>
              <span className="text-[10px] bg-purple-800/80 px-2 py-0.5 rounded-full border border-purple-700 text-purple-100">
                00:00 自動重設
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-amber-300">
              {remainingQuota.toLocaleString()} <span className="text-sm font-sans text-purple-200">點</span>
            </div>
            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between text-[11px] text-purple-200">
                <span>每日上限：{adminDailyQuota.toLocaleString()} 點</span>
                <span>已轉出：{usedQuota.toLocaleString()} 點 ({quotaPercent}%)</span>
              </div>
              <div className="w-full h-2 bg-purple-800/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-amber-300 rounded-full transition-all duration-300"
                  style={{ width: `${quotaPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 卡片 2: 當前授權身分 */}
        <div className="p-4 sm:p-5 rounded-2xl bg-stone-50 border border-stone-200 text-stone-800 flex flex-col justify-between">
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-stone-500">當前操作管理員</span>
            <div className="flex items-center gap-2.5">
              <img
                src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                alt={currentUser.name}
                className="w-9 h-9 rounded-xl object-cover ring-1 ring-stone-200"
              />
              <div className="min-w-0">
                <div className="text-xs font-black text-stone-900 truncate">{currentUser.name}</div>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-100 text-purple-900 font-bold">
                  官方管理員
                </span>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-stone-400 mt-2">
            系統將此操作者姓名記於受款人點數明細與系統日誌。
          </p>
        </div>
      </div>

      {/* 回饋訊息 */}
      {resultMsg && (
        <div
          className={`p-3.5 rounded-2xl flex items-center gap-2.5 text-xs font-bold ${
            resultMsg.isError
              ? 'bg-rose-50 border border-rose-200 text-rose-800'
              : 'bg-emerald-50 border border-emerald-200 text-emerald-900'
          }`}
        >
          {resultMsg.isError ? (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
          <span>{resultMsg.text}</span>
        </div>
      )}

      {/* 轉入操作主表單 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 左區塊：選擇受款用戶 (5 欄) */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
            <label className="text-xs font-black text-stone-900 flex items-center gap-1.5">
              <UserIcon className="w-4 h-4 text-purple-700" />
              <span>步驟 1：選擇受款用戶</span>
            </label>
            <span className="text-[11px] text-stone-400">共 {availableUsers.length} 位會員</span>
          </div>

          {/* 搜尋框 */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋姓名、專業領域或 Email..."
              className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-stone-50 border border-stone-200 focus:bg-white focus:border-purple-500 focus:outline-hidden"
            />
          </div>

          {/* 用戶列表 */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {filteredUsers.map((u) => {
              const isSelected = u.id === selectedUserId;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setSelectedUserId(u.id)}
                  className={`w-full p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-purple-50/90 border-purple-400 ring-2 ring-purple-200 shadow-2xs'
                      : 'bg-white border-stone-200 hover:bg-stone-50 hover:border-stone-300'
                  }`}
                >
                  <img
                    src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                    alt={u.name}
                    className="w-8 h-8 rounded-full object-cover ring-1 ring-stone-200 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-black text-stone-900 truncate">{u.name}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-bold shrink-0 ${
                          u.role === 'admin'
                            ? 'bg-purple-100 text-purple-900'
                            : u.role === 'solver'
                            ? 'bg-blue-100 text-blue-900'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {u.role === 'admin' ? '管理員' : u.role === 'solver' ? '解答者' : '提問者'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-stone-500 mt-0.5">
                      <span className="truncate max-w-[120px]">{u.title || u.email}</span>
                      <span className="font-mono font-bold text-stone-700">
                        目前 NT$ {(u.balance || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {selectedUser && (
            <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-200/80 text-xs text-purple-950 space-y-1">
              <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider block">
                已選定受款人
              </span>
              <div className="flex items-center justify-between font-bold">
                <span>{selectedUser.name}</span>
                <span className="font-mono text-purple-900">
                  轉入後預估餘額：NT$ {((selectedUser.balance || 0) + transferAmount).toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 右區塊：轉入金額與原因設定 (7 欄) */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-5">
          <div className="border-b border-stone-100 pb-2.5">
            <label className="text-xs font-black text-stone-900 flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-purple-700" />
              <span>步驟 2：設定轉入點數與審計事由</span>
            </label>
          </div>

          {/* 轉入金額輸入 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-stone-700">轉入點數額度 (點)</span>
              <span className="text-[11px] text-stone-500 font-mono">
                今日剩餘可轉：<strong className="text-purple-700">{remainingQuota.toLocaleString()}</strong> 點
              </span>
            </div>

            <div className="relative">
              <input
                type="number"
                min={1}
                max={remainingQuota}
                value={transferAmount || ''}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  setTransferAmount(val);
                }}
                className="w-full px-4 py-2.5 text-base font-mono font-black rounded-xl bg-stone-50 border border-stone-200 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-hidden"
                placeholder="輸入點數金額"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-500">
                點 (NT$)
              </span>
            </div>

            {/* 快捷按鈕 */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              {PRESET_AMOUNTS.map((amt) => {
                const disabled = amt > remainingQuota;
                return (
                  <button
                    key={amt}
                    type="button"
                    disabled={disabled}
                    onClick={() => setTransferAmount(amt)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      transferAmount === amt
                        ? 'bg-purple-600 text-white shadow-2xs'
                        : disabled
                        ? 'bg-stone-100 text-stone-300 cursor-not-allowed'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    +{amt.toLocaleString()}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setTransferAmount(remainingQuota)}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-900 hover:bg-amber-200 cursor-pointer ml-auto"
              >
                帶入今日剩餘上限 ({remainingQuota.toLocaleString()})
              </button>
            </div>
          </div>

          {/* 轉入事由分類 */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-700 block">轉入事由分類</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PRESET_REASONS.map((r) => {
                const isSelected = reasonCategory === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReasonCategory(r)}
                    className={`p-2 rounded-xl text-left text-xs font-semibold transition-all border cursor-pointer ${
                      isSelected
                        ? 'bg-purple-50 text-purple-950 border-purple-400 font-bold shadow-2xs'
                        : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 詳細備註說明 */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 block">
              詳細審計備註說明（選填，將記錄於日誌）
            </label>
            <input
              type="text"
              value={customReasonNote}
              onChange={(e) => setCustomReasonNote(e.target.value)}
              placeholder="例如：2026/09 創業大賽季軍激勵發放、工單 #8820 爭議補償款"
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-stone-50 border border-stone-200 focus:bg-white focus:border-purple-500 focus:outline-hidden"
            />
          </div>

          {/* 轉入按鈕 */}
          <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
            <div className="text-[11px] text-stone-400 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-stone-400" />
              <span>點擊後需二次確認以防誤觸</span>
            </div>
            <button
              type="button"
              disabled={!selectedUser || transferAmount <= 0 || transferAmount > remainingQuota}
              onClick={() => setIsConfirmModalOpen(true)}
              className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 active:bg-purple-800 disabled:bg-stone-200 disabled:text-stone-400 text-white font-black text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>確認轉入點數</span>
            </button>
          </div>
        </div>
      </div>

      {/* 轉入歷史審計紀錄 */}
      <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
          <h4 className="text-xs font-black text-stone-900 flex items-center gap-2">
            <History className="w-4 h-4 text-purple-700" />
            <span>管理員點數轉入審計日誌</span>
          </h4>
          <span className="text-[11px] text-stone-400">紀錄公開透明 • 自動歸檔</span>
        </div>

        {grantHistory.length === 0 ? (
          <div className="py-8 text-center text-xs text-stone-400">
            尚無管理員轉入點數紀錄
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {grantHistory.map((tx) => (
              <div
                key={tx.id}
                className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-stone-900">受款人：{tx.toUserName}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-black font-mono">
                      +{tx.amount.toLocaleString()} 點
                    </span>
                    <span className="text-[10px] text-stone-400 font-mono">
                      {new Date(tx.createdAt).toLocaleString('zh-TW')}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-600">{tx.note}</p>
                </div>
                <div className="text-[10px] text-purple-800 font-bold bg-purple-50 px-2 py-1 rounded-md border border-purple-100 self-start sm:self-auto shrink-0">
                  {tx.fromUserName}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 二次確認轉入彈窗 */}
      {isConfirmModalOpen && selectedUser && (
        <div
          onClick={() => setIsConfirmModalOpen(false)}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-stone-200 p-6 space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center gap-3 border-b border-stone-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center font-black shrink-0">
                <ShieldAlert className="w-5 h-5 text-purple-700" />
              </div>
              <div>
                <h3 className="font-black text-base text-stone-900">確認轉入點數？</h3>
                <p className="text-xs text-stone-500">點數將即時入帳並記入官方審計日誌</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-stone-500">受款用戶：</span>
                <span className="font-black text-stone-900">{selectedUser.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500">轉入金額：</span>
                <span className="font-mono font-black text-purple-700 text-sm">
                  +{transferAmount.toLocaleString()} 點 (NT$)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500">轉入事由：</span>
                <span className="font-bold text-stone-800">
                  {customReasonNote.trim() ? `${reasonCategory} (${customReasonNote.trim()})` : reasonCategory}
                </span>
              </div>
              <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-[11px]">
                <span className="text-stone-500">扣除後今日剩餘配額：</span>
                <span className="font-mono font-bold text-amber-700">
                  {(remainingQuota - transferAmount).toLocaleString()} 點
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs cursor-pointer transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleExecuteTransfer}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs shadow-xs cursor-pointer transition-colors"
              >
                確認撥付入帳
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

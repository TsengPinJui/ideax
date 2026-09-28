import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Clock,
  Search,
  Filter,
  User as UserIcon,
  ArrowDownRight,
  ArrowUpRight,
  FileText,
} from 'lucide-react';

export const AdminTransactionsTab: React.FC = () => {
  const { transactions, availableUsers } = useApp();

  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const selectedUser = availableUsers.find((u) => u.id === selectedUserId);

  const filteredTransactions = transactions.filter((tx) => {
    // 依個別用戶篩選
    if (selectedUserId !== 'all') {
      const matchParty =
        (selectedUser && (tx.fromUserName === selectedUser.name || tx.toUserName === selectedUser.name)) ||
        (tx as any).userId === selectedUserId;
      if (!matchParty) return false;
    }

    // 依交易類型篩選
    if (selectedType !== 'all' && tx.type !== selectedType) {
      return false;
    }

    // 關鍵字搜尋
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = (tx.id || '').toLowerCase().includes(q);
      const matchQTitle = (tx.relatedQuestionTitle || '').toLowerCase().includes(q);
      const matchFrom = (tx.fromUserName || '').toLowerCase().includes(q);
      const matchTo = (tx.toUserName || '').toLowerCase().includes(q);
      const matchNote = (tx.note || '').toLowerCase().includes(q);
      return matchId || matchQTitle || matchFrom || matchTo || matchNote;
    }

    return true;
  });

  const totalFilteredVolume = filteredTransactions.reduce((acc, t) => acc + (t.amount || 0), 0);
  const totalFilteredFees = filteredTransactions.reduce((acc, t) => acc + (t.platformFee || 0), 0);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* 標題與說明 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-3.5">
        <div>
          <h3 className="text-base sm:text-lg font-black text-stone-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-600" />
            <span>交易管理</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-900">
              全站共 {transactions.length} 筆交易
            </span>
          </h3>
          <p className="text-xs text-stone-500 mt-1">
            查閱全站及個別用戶之金流交易紀錄（懸賞預扣託管、解答者自動拆款撥付、方案付費解鎖、手動點數異動與手續費明細）。
          </p>
        </div>
      </div>

      {/* 篩選控制器 */}
      <div className="p-4 sm:p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* 1. 選擇個別用戶 */}
          <div>
            <label className="text-[11px] font-bold text-stone-700 block mb-1">
              查閱指定個別用戶交易：
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-900 outline-none focus:border-purple-600 cursor-pointer shadow-2xs"
            >
              <option value="all">全站所有用戶交易</option>
              {availableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role === 'admin' ? '管理員' : u.role === 'solver' ? '解答者' : '提問者'})
                </option>
              ))}
            </select>
          </div>

          {/* 2. 交易類型篩選 */}
          <div>
            <label className="text-[11px] font-bold text-stone-700 block mb-1">
              交易類型：
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-900 outline-none focus:border-purple-600 cursor-pointer shadow-2xs"
            >
              <option value="all">全部交易類型</option>
              <option value="懸賞託管">懸賞託管</option>
              <option value="解答者收益發放">解答者收益發放</option>
              <option value="付費解鎖方案">付費解鎖方案</option>
              <option value="點數儲值">點數儲值</option>
              <option value="點數扣抵">點數扣抵</option>
              <option value="爭議審查退款">爭議審查退款</option>
              <option value="月底抽成返還">月底抽成返還</option>
            </select>
          </div>

          {/* 3. 搜尋框 */}
          <div>
            <label className="text-[11px] font-bold text-stone-700 block mb-1">
              關鍵字搜尋：
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="搜尋題目名稱、交易編號或對手方..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 outline-none focus:border-purple-600"
              />
            </div>
          </div>
        </div>

        {/* 統計摘要列 */}
        <div className="pt-2 border-t border-stone-200 flex flex-wrap items-center justify-between text-xs text-stone-600">
          <div>
            目前檢視：<strong className="text-stone-900">{selectedUserId === 'all' ? '全站用戶' : selectedUser?.name}</strong> · 篩選符合 <strong>{filteredTransactions.length}</strong> 筆
          </div>
          <div className="flex items-center gap-4 font-mono font-bold">
            <span>流水總額：<strong className="text-purple-950 font-black">NT$ {totalFilteredVolume.toLocaleString()}</strong></span>
            <span>平台手續費：<strong className="text-amber-800 font-black">NT$ {totalFilteredFees.toLocaleString()}</strong></span>
          </div>
        </div>
      </div>

      {/* 交易紀錄清單 */}
      <div className="space-y-2.5">
        {filteredTransactions.length === 0 ? (
          <div className="p-10 text-center bg-stone-50 rounded-3xl border border-dashed border-stone-200 space-y-2">
            <Clock className="w-8 h-8 text-stone-300 mx-auto" />
            <p className="text-xs font-bold text-stone-600">無相符交易紀錄</p>
          </div>
        ) : (
          filteredTransactions.map((tx) => (
            <div
              key={tx.id}
              className="p-3.5 sm:p-4 rounded-2xl bg-white border border-stone-200 hover:border-purple-300 shadow-2xs transition-all space-y-1.5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                      tx.type === '懸賞託管'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : tx.type === '解答者收益發放'
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : tx.type === '付費解鎖方案'
                        ? 'bg-blue-100 text-blue-900 border border-blue-300'
                        : tx.type === '爭議審查退款'
                        ? 'bg-rose-100 text-rose-900 border border-rose-300'
                        : 'bg-stone-100 text-stone-800 border border-stone-200'
                    }`}
                  >
                    {tx.type}
                  </span>

                  <span className="font-extrabold text-stone-900">
                    {tx.relatedQuestionTitle || '平台帳務操作'}
                  </span>
                  <span className="text-[10px] font-mono text-stone-400">ID: {tx.id}</span>
                </div>

                <div className="text-right">
                  <span className="text-base font-black text-stone-900 font-mono">
                    NT$ {(tx.amount || 0).toLocaleString()}
                  </span>
                  {tx.platformFee > 0 && (
                    <span className="text-[10px] text-amber-800 font-semibold block">
                      抽成手續費 NT$ {tx.platformFee.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              {/* 交易對手方與狀態 */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-stone-500 pt-1 border-t border-stone-100">
                <div className="flex items-center gap-2 flex-wrap">
                  <span>付款方：<strong className="text-stone-700">{tx.fromUserName || '委託提問者'}</strong></span>
                  <span>➔</span>
                  <span>收款方：<strong className="text-stone-700">{tx.toUserName || '受款專家'}</strong></span>
                  {tx.paymentMethod && <span className="text-stone-400">· 方式：{tx.paymentMethod}</span>}
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.2 rounded border border-emerald-200">
                    {tx.status || '已完成'}
                  </span>
                  <span className="font-mono text-stone-400">{tx.createdAt.split('T')[0]}</span>
                </div>
              </div>

              {tx.note && (
                <p className="text-[11px] text-stone-500 bg-stone-50 p-2 rounded-lg leading-relaxed mt-1">
                  備註：{tx.note}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

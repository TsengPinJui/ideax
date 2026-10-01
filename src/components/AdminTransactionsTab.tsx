import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { isMockTransactionId } from '../data/mockData';
import {
  Clock,
  Search,
  Filter,
  User as UserIcon,
  ArrowDownRight,
  ArrowUpRight,
  FileText,
  Layers,
  Coins,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Tag,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';

export interface TransactionCategoryDef {
  key: string;
  label: string;
  shortLabel: string;
  badge: {
    bg: string;
    text: string;
  };
  types: string[];
}

export const TRANSACTION_CATEGORIES: TransactionCategoryDef[] = [
  {
    key: 'escrow',
    label: '📋 懸賞託管與預扣',
    shortLabel: '託管預扣',
    badge: {
      bg: 'bg-amber-100 text-amber-900 border-amber-300',
      text: '託管預扣',
    },
    types: ['第三方懸賞託管', '階段方案預扣', '懸賞託管'],
  },
  {
    key: 'payout',
    label: '💰 解答採納與拆款撥付',
    shortLabel: '採納拆款',
    badge: {
      bg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      text: '收益拆款',
    },
    types: ['第三方採納拆款撥付', '階段交付拆款撥付', '解答者收益發放', '階段款項結算'],
  },
  {
    key: 'unlock',
    label: '🔓 方案解鎖與私聊交易',
    shortLabel: '方案解鎖',
    badge: {
      bg: 'bg-blue-100 text-blue-900 border-blue-300',
      text: '方案解鎖',
    },
    types: ['第三方方案解鎖', '私聊自訂方案交易', '付費解鎖方案'],
  },
  {
    key: 'subscription',
    label: '👑 會員方案訂閱',
    shortLabel: '會員訂閱',
    badge: {
      bg: 'bg-purple-100 text-purple-900 border-purple-300',
      text: '會員訂閱',
    },
    types: ['會員方案訂閱', '訂閱會員方案'],
  },
  {
    key: 'dispute',
    label: '⚖️ 爭議審查與退款',
    shortLabel: '爭議退款',
    badge: {
      bg: 'bg-rose-100 text-rose-900 border-rose-300',
      text: '爭議退款',
    },
    types: ['爭議審查退款', '爭議申訴退還預扣', '託管退款'],
  },
  {
    key: 'deposit',
    label: '🪙 點數儲值與充值入金',
    shortLabel: '點數儲值',
    badge: {
      bg: 'bg-teal-100 text-teal-900 border-teal-300',
      text: '點數儲值',
    },
    types: ['錢包儲值', '點數儲值', '儲值'],
  },
  {
    key: 'deduction',
    label: '💳 點數消費與服務扣抵',
    shortLabel: '點數扣抵',
    badge: {
      bg: 'bg-orange-100 text-orange-900 border-orange-300',
      text: '點數扣抵',
    },
    types: ['點數扣抵', '預扣額折抵解鎖'],
  },
  {
    key: 'admin_transfer',
    label: '🛡️ 管理員調度轉入',
    shortLabel: '管理調度',
    badge: {
      bg: 'bg-indigo-100 text-indigo-900 border-indigo-300',
      text: '管理調度',
    },
    types: ['管理員轉入點數', '管理員手動調整'],
  },
  {
    key: 'withdrawal',
    label: '🏦 銀行提領出金',
    shortLabel: '銀行提領',
    badge: {
      bg: 'bg-stone-200 text-stone-800 border-stone-300',
      text: '帳戶提領',
    },
    types: ['提領申請', '提現申請'],
  },
  {
    key: 'rebate',
    label: '🔄 平台抽成與月底返還',
    shortLabel: '抽成返還',
    badge: {
      bg: 'bg-lime-100 text-lime-900 border-lime-300',
      text: '抽成返還',
    },
    types: ['月底抽成返還', '平台抽成'],
  },
  {
    key: 'promotion',
    label: '📣 付費推播與廣告活動',
    shortLabel: '付費推播',
    badge: {
      bg: 'bg-pink-100 text-pink-900 border-pink-300',
      text: '推播方案',
    },
    types: ['付費推播方案'],
  },
  {
    key: 'other',
    label: '📑 其他自訂帳務標註',
    shortLabel: '其他帳務',
    badge: {
      bg: 'bg-stone-100 text-stone-800 border-stone-200',
      text: '其他帳務',
    },
    types: ['系統資金移轉', '平台帳務操作', '帳戶資金異動'],
  },
];

/**
 * 核心分類對應函數：
 * 採用優先級比對，確保精確性（如含有「退款」或「退還」一律歸入爭議審查，不被「預扣」誤攔）
 */
export const getTransactionCategory = (rawType: string): TransactionCategoryDef => {
  const type = (rawType || '').trim();
  if (!type) {
    return TRANSACTION_CATEGORIES.find((c) => c.key === 'other')!;
  }

  // 1. 完全比對已定義類型清單
  for (const cat of TRANSACTION_CATEGORIES) {
    if (cat.types.includes(type)) {
      return cat;
    }
  }

  // 2. 關鍵字優先級比對（順序極關鍵：退款/爭議優先於託管/預扣）
  if (type.includes('退款') || type.includes('退還') || type.includes('爭議')) {
    return TRANSACTION_CATEGORIES.find((c) => c.key === 'dispute')!;
  }
  if (type.includes('託管') || type.includes('懸賞') || (type.includes('預扣') && !type.includes('折抵'))) {
    return TRANSACTION_CATEGORIES.find((c) => c.key === 'escrow')!;
  }
  if (type.includes('採納') || type.includes('拆款') || type.includes('收益') || type.includes('結算')) {
    return TRANSACTION_CATEGORIES.find((c) => c.key === 'payout')!;
  }
  if (type.includes('解鎖') || type.includes('私聊') || type.includes('方案交易')) {
    return TRANSACTION_CATEGORIES.find((c) => c.key === 'unlock')!;
  }
  if (type.includes('訂閱') || type.includes('會員方案') || type.includes('會員等級')) {
    return TRANSACTION_CATEGORIES.find((c) => c.key === 'subscription')!;
  }
  if (type.includes('儲值') || type.includes('充值') || type.includes('入金')) {
    return TRANSACTION_CATEGORIES.find((c) => c.key === 'deposit')!;
  }
  if (type.includes('扣抵') || type.includes('折抵') || type.includes('消費') || type.includes('支出')) {
    return TRANSACTION_CATEGORIES.find((c) => c.key === 'deduction')!;
  }
  if (type.includes('管理員') || type.includes('調度') || type.includes('管理轉入')) {
    return TRANSACTION_CATEGORIES.find((c) => c.key === 'admin_transfer')!;
  }
  if (type.includes('提領') || type.includes('提現') || type.includes('出金')) {
    return TRANSACTION_CATEGORIES.find((c) => c.key === 'withdrawal')!;
  }
  if (type.includes('返還') || type.includes('抽成') || type.includes('手續費')) {
    return TRANSACTION_CATEGORIES.find((c) => c.key === 'rebate')!;
  }
  if (type.includes('推播') || type.includes('置頂') || type.includes('廣告') || type.includes('廣播')) {
    return TRANSACTION_CATEGORIES.find((c) => c.key === 'promotion')!;
  }

  return TRANSACTION_CATEGORIES.find((c) => c.key === 'other')!;
};

export const getTransactionBadge = (type: string) => {
  const cat = getTransactionCategory(type);
  return {
    bg: cat.badge.bg,
    category: cat.badge.text,
    categoryLabel: cat.label,
    groupKey: cat.key,
  };
};

export const AdminTransactionsTab: React.FC = () => {
  const { transactions, availableUsers, isDemoMode, isNoPaymentMode } = useApp();

  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const selectedUser = availableUsers.find((u) => u.id === selectedUserId);

  // 1. 動態搜集並將全站每一筆交易的標註類型歸入所屬大類，確保 100% 呈現在分類名單中，絕無遺漏
  const dynamicCategories = useMemo(() => {
    const map = new Map<string, { cat: TransactionCategoryDef; types: Set<string> }>();
    TRANSACTION_CATEGORIES.forEach((c) => {
      map.set(c.key, { cat: c, types: new Set(c.types) });
    });

    transactions.forEach((tx) => {
      if (!tx.type || !tx.type.trim()) return;
      const cleanType = tx.type.trim();
      const matchedCat = getTransactionCategory(cleanType);
      const entry = map.get(matchedCat.key);
      if (entry) {
        entry.types.add(cleanType);
      }
    });

    return Array.from(map.values()).map(({ cat, types }) => ({
      ...cat,
      types: Array.from(types),
    }));
  }, [transactions]);

  // 全站出現過的所有不重複類型集合
  const allUniqueTypes = useMemo(() => {
    const set = new Set<string>();
    dynamicCategories.forEach((cat) => {
      cat.types.forEach((t) => set.add(t));
    });
    return Array.from(set);
  }, [dynamicCategories]);

  // 2. 統計各單項具體類型的交易筆數
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    transactions.forEach((tx) => {
      if ((isNoPaymentMode || !isDemoMode) && isMockTransactionId(tx.id)) return;
      const t = tx.type ? tx.type.trim() : '其他';
      counts[t] = (counts[t] || 0) + 1;
    });
    return counts;
  }, [transactions, isNoPaymentMode, isDemoMode]);

  // 3. 統計各大類群組中現有交易筆數（嚴格按照 getTransactionCategory 映射，無重複計算）
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0 };
    dynamicCategories.forEach((c) => {
      counts[c.key] = 0;
    });

    transactions.forEach((tx) => {
      if ((isNoPaymentMode || !isDemoMode) && isMockTransactionId(tx.id)) return;
      counts.all += 1;
      const cat = getTransactionCategory(tx.type);
      counts[cat.key] = (counts[cat.key] || 0) + 1;
    });

    return counts;
  }, [transactions, dynamicCategories, isNoPaymentMode, isDemoMode]);

  // 4. 複合篩選
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if ((isNoPaymentMode || !isDemoMode) && isMockTransactionId(tx.id)) {
        return false;
      }
      // 依個別用戶篩選
      if (selectedUserId !== 'all') {
        const matchParty =
          (selectedUser && (tx.fromUserName === selectedUser.name || tx.toUserName === selectedUser.name)) ||
          (tx as any).userId === selectedUserId;
        if (!matchParty) return false;
      }

      // 依交易類型分類篩選（支援大類群組與精準單項篩選）
      if (selectedType !== 'all') {
        if (selectedType.startsWith('group:')) {
          const groupKey = selectedType.replace('group:', '');
          const cat = getTransactionCategory(tx.type);
          if (cat.key !== groupKey) return false;
        } else {
          // 精準單一類型比對
          if (tx.type !== selectedType) return false;
        }
      }

      // 關鍵字搜尋
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = (tx.id || '').toLowerCase().includes(q);
        const matchType = (tx.type || '').toLowerCase().includes(q);
        const matchQTitle = (tx.relatedQuestionTitle || '').toLowerCase().includes(q);
        const matchFrom = (tx.fromUserName || '').toLowerCase().includes(q);
        const matchTo = (tx.toUserName || '').toLowerCase().includes(q);
        const matchNote = (tx.note || '').toLowerCase().includes(q);
        return matchId || matchType || matchQTitle || matchFrom || matchTo || matchNote;
      }

      return true;
    });
  }, [transactions, selectedUserId, selectedUser, selectedType, searchQuery, isNoPaymentMode, isDemoMode]);

  const totalFilteredVolume = filteredTransactions.reduce((acc, t) => acc + (t.amount || 0), 0);
  const totalFilteredFees = filteredTransactions.reduce((acc, t) => acc + (t.platformFee || 0), 0);

  // 取得目前選取的分類標籤文字
  const currentFilterLabel = useMemo(() => {
    if (selectedType === 'all') return '全部類型 (全選)';
    if (selectedType.startsWith('group:')) {
      const gKey = selectedType.replace('group:', '');
      return dynamicCategories.find((c) => c.key === gKey)?.label || gKey;
    }
    return selectedType;
  }, [selectedType, dynamicCategories]);

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-200">
      {/* 標題與說明 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-3.5">
        <div>
          <h3 className="text-base sm:text-lg font-black text-stone-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-600" />
            <span>交易管理</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-900">
              全站共 {transactions.length} 筆交易 · {allUniqueTypes.length} 種分類標籤
            </span>
          </h3>
          <p className="text-xs text-stone-500 mt-1 leading-relaxed">
            全站各單交易金流稽核紀錄（含懸賞託管、階段拆款、方案解鎖、會員訂閱、點數儲值扣抵、爭議退款與手續費明細），所有已標註類型均按標準大類嚴格歸類，支援一鍵點擊穿透篩選。
          </p>
        </div>

        {selectedType !== 'all' && (
          <button
            type="button"
            onClick={() => setSelectedType('all')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition-colors cursor-pointer self-start sm:self-auto shrink-0 shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>重置分類篩選</span>
          </button>
        )}
      </div>

      {/* 快速大類選取標籤列（支援手機橫向順暢滑動） */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-stone-500 px-0.5">
          <span className="text-[11px] font-bold flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-purple-600" />
            <span>依大類快速篩選：</span>
          </span>
          <span className="text-[10px] text-stone-400">可左右橫向滑動查閱全部分類</span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          <button
            type="button"
            onClick={() => setSelectedType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              selectedType === 'all'
                ? 'bg-purple-700 text-white shadow-2xs font-black ring-2 ring-purple-300'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            <span>全部交易</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                selectedType === 'all' ? 'bg-purple-800 text-white' : 'bg-stone-200 text-stone-600'
              }`}
            >
              {categoryCounts.all}
            </span>
          </button>

          {dynamicCategories.map((cat) => {
            const isSelected = selectedType === `group:${cat.key}`;
            const count = categoryCounts[cat.key] || 0;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setSelectedType(isSelected ? 'all' : `group:${cat.key}`)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-purple-700 text-white shadow-2xs font-black ring-2 ring-purple-300'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-purple-800 text-white' : 'bg-stone-200 text-stone-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
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
              className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-900 outline-none focus:border-purple-600 cursor-pointer shadow-2xs"
            >
              <option value="all">全站所有用戶交易</option>
              {availableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role === 'admin' ? '管理員' : u.role === 'solver' ? '解答者' : '提問者'})
                </option>
              ))}
            </select>
          </div>

          {/* 2. 交易類型分類選單（完整涵蓋所有已標註類型，結構化 optgroup） */}
          <div>
            <label className="text-[11px] font-bold text-stone-700 block mb-1 flex items-center justify-between">
              <span>交易類型分類名單：</span>
              <span className="text-[10px] text-purple-700 font-mono">共 {allUniqueTypes.length} 種已標註標籤</span>
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-900 outline-none focus:border-purple-600 cursor-pointer shadow-2xs"
            >
              <option value="all">全選：所有交易類型 ({categoryCounts.all} 筆)</option>

              {/* 依結構化大類排列，每一大類均提供大類彙整全選與旗下具體細分單項 */}
              {dynamicCategories.map((cat) => {
                const groupCount = categoryCounts[cat.key] || 0;
                return (
                  <optgroup key={cat.key} label={`── ${cat.label} (${groupCount} 筆) ──`}>
                    <option value={`group:${cat.key}`}>
                      【大類彙整】{cat.label} (全選 · {groupCount} 筆)
                    </option>
                    {cat.types.map((subType) => {
                      const count = typeCounts[subType] || 0;
                      return (
                        <option key={subType} value={subType}>
                          &nbsp;&nbsp;• {subType} ({count} 筆)
                        </option>
                      );
                    })}
                  </optgroup>
                );
              })}
            </select>
          </div>

          {/* 3. 關鍵字搜尋 */}
          <div>
            <label className="text-[11px] font-bold text-stone-700 block mb-1">
              關鍵字搜尋：
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="搜尋問題標題、交易類型、ID 或對手方..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 outline-none focus:border-purple-600"
              />
            </div>
          </div>
        </div>

        {/* 統計摘要列 */}
        <div className="pt-2.5 border-t border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-stone-600 gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span>目前檢視：<strong className="text-stone-900">{selectedUserId === 'all' ? '全站用戶' : selectedUser?.name}</strong></span>
            <span>·</span>
            <span>分類篩選：<strong className="text-purple-900">{currentFilterLabel}</strong></span>
            <span>·</span>
            <span>符合 <strong className="text-purple-700 font-mono text-sm">{filteredTransactions.length}</strong> 筆</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 font-mono font-bold">
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
            <p className="text-[11px] text-stone-400">目前選擇的分類條件未包含任何交易，可點擊上方「全部交易」或「重置分類篩選」。</p>
          </div>
        ) : (
          filteredTransactions.map((tx) => {
            const badge = getTransactionBadge(tx.type);
            const isTypeActive = selectedType === tx.type;
            const isGroupActive = selectedType === `group:${badge.groupKey}`;

            return (
              <div
                key={tx.id}
                className="p-3.5 sm:p-4 rounded-2xl bg-white border border-stone-200 hover:border-purple-300 shadow-2xs transition-all space-y-2"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* 交易類型精確標籤（點擊可快速依此精準標籤篩選） */}
                    <button
                      type="button"
                      onClick={() => setSelectedType(isTypeActive ? 'all' : tx.type)}
                      title="點擊依此交易類型篩選"
                      className={`px-2 py-0.5 rounded-md text-[10px] font-black border transition-all cursor-pointer ${badge.bg} ${
                        isTypeActive ? 'ring-2 ring-purple-600 font-black' : 'hover:opacity-80'
                      }`}
                    >
                      {tx.type}
                    </button>

                    {/* 所屬大類徽章（點擊可快速依該大類群組篩選） */}
                    <button
                      type="button"
                      onClick={() => setSelectedType(isGroupActive ? 'all' : `group:${badge.groupKey}`)}
                      title={`歸類大類：${badge.categoryLabel}（點擊依此大類篩選）`}
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded border transition-all cursor-pointer ${
                        isGroupActive
                          ? 'bg-purple-100 text-purple-900 border-purple-300 font-black'
                          : 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200'
                      }`}
                    >
                      {badge.category}
                    </button>

                    <span className="font-extrabold text-stone-900">
                      {tx.relatedQuestionTitle || '平台帳務操作'}
                    </span>
                    <span className="text-[10px] font-mono text-stone-400">ID: {tx.id}</span>
                  </div>

                  <div className="text-left sm:text-right">
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-stone-500 pt-1.5 border-t border-stone-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span>付款方：<strong className="text-stone-700">{tx.fromUserName || '委託提問者'}</strong></span>
                    <span>➔</span>
                    <span>收款方：<strong className="text-stone-700">{tx.toUserName || '受款專家'}</strong></span>
                    {tx.paymentMethod && <span className="text-stone-400">· 方式：{tx.paymentMethod}</span>}
                    {tx.bankAccountSnapshot && (
                      <span className="text-stone-400 font-mono text-[10px]">· 帳戶：{tx.bankAccountSnapshot}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.2 rounded border border-emerald-200">
                      {tx.status || '已完成'}
                    </span>
                    {tx.payoutStatus && (
                      <span className="text-[10px] font-bold text-stone-500 bg-stone-100 px-1.5 py-0.2 rounded">
                        {tx.payoutStatus}
                      </span>
                    )}
                    <span className="font-mono text-stone-400">{tx.createdAt ? tx.createdAt.split('T')[0] : ''}</span>
                  </div>
                </div>

                {tx.note && (
                  <p className="text-[11px] text-stone-600 bg-stone-50/80 border border-stone-100 p-2 rounded-xl leading-relaxed">
                    <strong className="text-stone-700">明細備註：</strong>{tx.note}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

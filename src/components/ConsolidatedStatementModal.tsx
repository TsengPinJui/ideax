import React, { useState, useRef, useMemo } from 'react';
import { Transaction, User } from '../types';
import {
  X,
  Printer,
  Download,
  ShieldCheck,
  FileText,
  Building2,
  Calendar,
  CreditCard,
  Copy,
  Check,
  Layers,
  ArrowDownRight,
  ArrowUpRight,
  UserCheck,
} from 'lucide-react';
import { formatTransactionItem } from './AdminTransactionsTab';

interface ConsolidatedStatementModalProps {
  transactions: Transaction[];
  currentUser: User;
  onClose: () => void;
}

export const ConsolidatedStatementModal: React.FC<ConsolidatedStatementModalProps> = ({
  transactions,
  currentUser,
  onClose,
}) => {
  const [recipientName, setRecipientName] = useState(currentUser?.name || '平台會員');
  const [taxId, setTaxId] = useState('');
  const [statementTitle, setStatementTitle] = useState('IdeaX 創點子・點子與人才媒合平台・多筆交易統一對帳結算單');
  const [customRemark, setCustomRemark] = useState('');
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');

  const printAreaRef = useRef<HTMLDivElement>(null);

  // 排序交易：依時間由新至舊
  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [transactions]);

  // 經格式化之項目
  const items = useMemo(() => {
    return sortedTransactions.map((tx, index) => {
      const itemInfo = formatTransactionItem(tx, currentUser?.name);
      return {
        index: index + 1,
        tx,
        itemInfo,
      };
    });
  }, [sortedTransactions, currentUser]);

  // 根據篩選過濾
  const displayedItems = useMemo(() => {
    if (filterType === 'income') return items.filter((i) => i.itemInfo.isIncome);
    if (filterType === 'expense') return items.filter((i) => !i.itemInfo.isIncome);
    return items;
  }, [items, filterType]);

  // 財務統計彙總
  const stats = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    let totalFee = 0;
    let incomeCount = 0;
    let expenseCount = 0;

    items.forEach(({ tx, itemInfo }) => {
      if (itemInfo.isIncome) {
        totalIncome += itemInfo.displayAmount;
        incomeCount++;
      } else {
        totalExpense += itemInfo.displayAmount;
        expenseCount++;
      }
      if (tx.platformFee && tx.platformFee > 0) {
        totalFee += tx.platformFee;
      }
    });

    const netBalance = totalIncome - totalExpense;

    // 計算交易起訖日期
    const dates = items
      .map((i) => i.tx.createdAt)
      .filter(Boolean)
      .map((d) => new Date(d).getTime());

    let dateRange = '單日結算';
    if (dates.length > 0) {
      const minDate = new Date(Math.min(...dates)).toISOString().split('T')[0];
      const maxDate = new Date(Math.max(...dates)).toISOString().split('T')[0];
      dateRange = minDate === maxDate ? minDate : `${minDate} ～ ${maxDate}`;
    }

    return {
      totalCount: items.length,
      incomeCount,
      expenseCount,
      totalIncome,
      totalExpense,
      totalFee,
      netBalance,
      dateRange,
    };
  }, [items]);

  const statementNo = useMemo(() => {
    const seed = Date.now().toString().slice(-6);
    return `STMT-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${seed}`;
  }, []);

  const issueDate = useMemo(() => {
    return new Date().toISOString().replace('T', ' ').slice(0, 19);
  }, []);

  // 列印 / 另存為標準 PDF
  const handlePrint = () => {
    window.print();
  };

  // 生成獨立 HTML 檔案供下載
  const handleDownloadHtml = () => {
    const rowsHtml = displayedItems
      .map(
        ({ index, tx, itemInfo }) => `
      <tr>
        <td style="text-align: center; color: #78716c;">${index}</td>
        <td style="font-family: monospace; font-size: 11px;">${tx.createdAt ? tx.createdAt.replace('T', ' ').slice(0, 16) : '-'}</td>
        <td style="font-family: monospace; font-size: 11px; font-weight: bold;">${tx.id}</td>
        <td><span style="display: inline-block; padding: 2px 6px; font-size: 10px; font-weight: bold; border-radius: 4px; background: ${itemInfo.isIncome ? '#d1fae5; color: #065f46;' : '#ffe4e6; color: #9f1239;'}">${tx.type || itemInfo.categoryLabel}</span></td>
        <td>
          <div style="font-weight: bold; color: #1c1917;">${itemInfo.cleanTitle}</div>
          <div style="font-size: 11px; color: #78716c;">付款方：${tx.fromUserName || '委託方'} ➔ 收款方：${tx.toUserName || '受款方'}</div>
        </td>
        <td style="text-align: right; font-family: monospace; font-weight: bold; font-size: 13px; color: ${itemInfo.isIncome ? '#059669;' : '#e11d48;'}">${itemInfo.amountFormatted}</td>
        <td style="font-size: 11px; color: #78716c;">${tx.note || '-'}</td>
      </tr>
    `
      )
      .join('');

    const htmlContent = `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <title>${statementTitle} - ${statementNo}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; padding: 36px; color: #1c1917; line-height: 1.5; background: #fff; max-width: 960px; margin: 0 auto; }
    .header { text-align: center; border-bottom: 2px solid #e7e5e4; padding-bottom: 16px; margin-bottom: 20px; }
    .header h1 { margin: 0; font-size: 22px; color: #1c1917; }
    .header p { margin: 4px 0 0; font-size: 13px; color: #78716c; }
    .stmt-no { display: inline-block; background: #fef3c7; color: #92400e; padding: 4px 14px; border-radius: 6px; font-family: monospace; font-size: 12px; margin-top: 10px; border: 1px solid #fde68a; font-weight: bold; }
    .meta-grid { display: flex; justify-content: space-between; margin: 18px 0; font-size: 13px; background: #fafaf9; padding: 14px 18px; border-radius: 10px; border: 1px solid #f5f5f4; }
    .summary-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 18px 0; }
    .card { background: #fafaf9; border: 1px solid #e7e5e4; padding: 12px; border-radius: 8px; text-align: center; }
    .card .title { font-size: 11px; color: #78716c; font-weight: bold; }
    .card .value { font-size: 16px; font-weight: bold; font-family: monospace; margin-top: 4px; }
    .table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 12px; }
    .table th, .table td { border: 1px solid #e7e5e4; padding: 9px 10px; text-align: left; }
    .table th { background: #f5f5f4; font-weight: bold; color: #44403c; }
    .stamp-box { position: relative; border: 1px dashed #d6d3d1; padding: 16px; border-radius: 12px; margin-top: 24px; font-size: 12px; color: #78716c; background: #fafaf9; }
    .seal { position: absolute; right: 28px; top: 14px; width: 90px; height: 90px; border: 3px solid #dc2626; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #dc2626; font-size: 9.5px; font-weight: 900; transform: rotate(-8deg); opacity: 0.9; }
    .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #a8a29e; border-top: 1px solid #f5f5f4; padding-top: 14px; }
    @media print { body { padding: 0; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>IdeaX 創點子・點子與人才媒合平台</h1>
    <p>多筆交易統一對帳結算單 (Consolidated Transaction Statement)</p>
    <div class="stmt-no">對帳單號：${statementNo}</div>
  </div>

  <div class="meta-grid">
    <div>
      <div><strong>對象／買受人：</strong>${recipientName || '一般會員'}${taxId ? ` (統編：${taxId})` : ''}</div>
      <div style="margin-top: 4px;"><strong>對帳區間：</strong>${stats.dateRange}</div>
      ${customRemark ? `<div style="margin-top: 4px;"><strong>備註：</strong>${customRemark}</div>` : ''}
    </div>
    <div style="text-align: right;">
      <div><strong>開立日期：</strong>${issueDate}</div>
      <div style="margin-top: 4px;"><strong>結算筆數：</strong>共 ${displayedItems.length} 筆交易</div>
    </div>
  </div>

  <div class="summary-cards">
    <div class="card">
      <div class="title">交易總筆數</div>
      <div class="value">${stats.totalCount} 筆</div>
    </div>
    <div class="card">
      <div class="title">收入總計 (${stats.incomeCount}筆)</div>
      <div class="value" style="color: #059669;">+ NT$ ${stats.totalIncome.toLocaleString()}</div>
    </div>
    <div class="card">
      <div class="title">支出總計 (${stats.expenseCount}筆)</div>
      <div class="value" style="color: #e11d48;">- NT$ ${stats.totalExpense.toLocaleString()}</div>
    </div>
    <div class="card" style="background: #fef3c7; border-color: #fde68a;">
      <div class="title" style="color: #92400e;">收支淨差額</div>
      <div class="value" style="color: #92400e;">NT$ ${stats.netBalance.toLocaleString()}</div>
    </div>
  </div>

  <table class="table">
    <thead>
      <tr>
        <th style="width: 36px; text-align: center;">#</th>
        <th style="width: 110px;">時間</th>
        <th style="width: 90px;">交易ID</th>
        <th style="width: 90px;">類別</th>
        <th>案件標題與收付款方</th>
        <th style="width: 100px; text-align: right;">金額</th>
        <th style="width: 120px;">明細備註</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <div class="stamp-box">
    <div style="font-weight: bold; color: #44403c; margin-bottom: 6px;">【官方平台審計與金流存證聲明】</div>
    <div>1. 本對帳單係 IdeaX 創點子・點子與人才媒合平台依據全站資料庫真實交易紀錄彙總產出，具備正式對帳與金流查核效力。</div>
    <div>2. 款項均經第三方金融信託金流與數位帳本嚴格稽核，若需索取特定單筆交易之營業發票或進一步報稅憑證，請洽詢官方財務中心。</div>
    <div>3. 查詢認證代碼：<span style="font-family: monospace; font-weight: bold; color: #1c1917;">${statementNo}</span></div>

    <div class="seal">
      <span>創點子 IdeaX</span>
      <span style="font-size: 8px; margin: 2px 0;">財務審計中心</span>
      <span style="font-size: 7.5px;">結算核訖章</span>
    </div>
  </div>

  <div class="footer">
    IdeaX 創點子團隊 · 客服支援：ideax.office@gmail.com
  </div>
</body>
</html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `IdeaX_統一對帳單_${statementNo}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 複製文字摘要
  const handleCopySummary = () => {
    const lines = [
      `【IdeaX 統一對帳單 - ${statementNo}】`,
      `對象：${recipientName}${taxId ? ` (統編: ${taxId})` : ''}`,
      `對帳區間：${stats.dateRange}`,
      `總筆數：${stats.totalCount} 筆`,
      `收入總計：+ NT$ ${stats.totalIncome.toLocaleString()} (${stats.incomeCount} 筆)`,
      `支出總計：- NT$ ${stats.totalExpense.toLocaleString()} (${stats.expenseCount} 筆)`,
      `淨差額：NT$ ${stats.netBalance.toLocaleString()}`,
      `----------------------------------------`,
      ...displayedItems.map(
        ({ index, tx, itemInfo }) =>
          `${index}. [${tx.id}] ${tx.createdAt?.slice(0, 10)} | ${tx.type} | ${itemInfo.cleanTitle} | ${itemInfo.amountFormatted}`
      ),
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-1.5 sm:p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-stone-200 w-full max-w-4xl max-h-[96vh] sm:max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-3.5 sm:p-5 bg-stone-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">多筆交易統一對帳單</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold border border-amber-400/30">
                  已勾選 {items.length} 筆
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">單號：{statementNo} · 區間：{stats.dateRange}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopySummary}
              className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-stone-700"
              title="複製對帳單文字摘要"
            >
              {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copiedSummary ? '已複製' : '複製摘要'}</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-stone-700"
              title="列印或另存為標準 PDF"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">列印 / PDF</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadHtml}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
              title="下載獨立 HTML/PDF 格式檔案"
            >
              <Download className="w-3.5 h-3.5" />
              <span>下載對帳單</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-2.5 sm:p-6 space-y-4 sm:space-y-5 bg-stone-50/50" ref={printAreaRef}>
          {/* 1. 對象與自訂抬頭設定欄（可即時編輯） */}
          <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between text-xs font-extrabold text-stone-900 border-b border-stone-100 pb-2">
              <span className="flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-purple-600" />
                <span>對帳單抬頭與報稅資訊（可直接在此修改）：</span>
              </span>
              <span className="text-[11px] font-normal text-stone-400">開立日期：{issueDate}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-stone-600 mb-1">對象／買受人姓名</label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="例如：柯育任 / 創投研究團隊"
                  className="w-full px-3 py-1.5 bg-stone-50 hover:bg-white focus:bg-white border border-stone-200 focus:border-purple-500 rounded-xl outline-none font-bold text-stone-800 transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-600 mb-1">統一編號（選填，報稅報帳用）</label>
                <input
                  type="text"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  placeholder="8 位數字統編"
                  maxLength={8}
                  className="w-full px-3 py-1.5 bg-stone-50 hover:bg-white focus:bg-white border border-stone-200 focus:border-purple-500 rounded-xl outline-none font-mono text-stone-800 transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-600 mb-1">自訂備註說明（選填）</label>
                <input
                  type="text"
                  value={customRemark}
                  onChange={(e) => setCustomRemark(e.target.value)}
                  placeholder="例如：2026年9月份專家諮詢結算"
                  className="w-full px-3 py-1.5 bg-stone-50 hover:bg-white focus:bg-white border border-stone-200 focus:border-purple-500 rounded-xl outline-none text-stone-800 transition-all"
                />
              </div>
            </div>
          </div>

          {/* 2. 財務總彙卡片 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-white border border-stone-200 shadow-2xs">
              <span className="text-[11px] font-bold text-stone-500 block">已選交易總數</span>
              <span className="text-xl font-black font-mono text-stone-900 block mt-1">
                {stats.totalCount} <span className="text-xs font-normal text-stone-400">筆</span>
              </span>
              <span className="text-[10px] text-stone-400 block mt-0.5">涵蓋 {stats.dateRange}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 shadow-2xs">
              <span className="text-[11px] font-bold text-emerald-800 flex items-center justify-between">
                <span>收入合計 ({stats.incomeCount}筆)</span>
                <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600" />
              </span>
              <span className="text-xl font-black font-mono text-emerald-700 block mt-1">
                + NT$ {stats.totalIncome.toLocaleString()}
              </span>
              <span className="text-[10px] text-emerald-600/80 block mt-0.5">採納收益、退款、返還等</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200 shadow-2xs">
              <span className="text-[11px] font-bold text-rose-800 flex items-center justify-between">
                <span>支出合計 ({stats.expenseCount}筆)</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
              </span>
              <span className="text-xl font-black font-mono text-rose-700 block mt-1">
                - NT$ {stats.totalExpense.toLocaleString()}
              </span>
              <span className="text-[10px] text-rose-600/80 block mt-0.5">儲值、訂閱、提領、解鎖等</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-300 shadow-2xs">
              <span className="text-[11px] font-black text-amber-900 block">結算淨差額 (Net)</span>
              <span className={`text-xl font-black font-mono block mt-1 ${stats.netBalance >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
                {stats.netBalance >= 0 ? '+' : ''}NT$ {stats.netBalance.toLocaleString()}
              </span>
              <span className="text-[10px] text-amber-800 font-bold block mt-0.5">
                平台手續費合計：NT$ {stats.totalFee.toLocaleString()}
              </span>
            </div>
          </div>

          {/* 3. 交易明細篩選與清單表格 */}
          <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-600" />
                <h4 className="font-extrabold text-sm text-stone-900">對帳明細列表（共 {displayedItems.length} 筆）</h4>
              </div>

              {/* 篩選標籤 */}
              <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setFilterType('all')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    filterType === 'all'
                      ? 'bg-white text-stone-900 shadow-2xs'
                      : 'text-stone-500 hover:text-stone-900'
                  }`}
                >
                  全部 ({items.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('income')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    filterType === 'income'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-stone-500 hover:text-emerald-700'
                  }`}
                >
                  收入 ({stats.incomeCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('expense')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    filterType === 'expense'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'text-stone-500 hover:text-rose-700'
                  }`}
                >
                  支出 ({stats.expenseCount})
                </button>
              </div>
            </div>

            {/* 表格 */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-y border-stone-200 text-stone-600 font-bold">
                    <th className="py-2.5 px-3 text-center w-10">#</th>
                    <th className="py-2.5 px-3 w-28">交易時間</th>
                    <th className="py-2.5 px-3 w-24">單號</th>
                    <th className="py-2.5 px-3 w-28">項目類別</th>
                    <th className="py-2.5 px-3">案件摘要與對手方</th>
                    <th className="py-2.5 px-3 text-right w-28">結算金額</th>
                    <th className="py-2.5 px-3 w-36">備註</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {displayedItems.map(({ index, tx, itemInfo }) => (
                    <tr key={tx.id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="py-2.5 px-3 text-center text-stone-400 font-mono text-[11px]">{index}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-stone-500 whitespace-nowrap">
                        {tx.createdAt ? tx.createdAt.replace('T', ' ').slice(0, 16) : '-'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] font-bold text-stone-700 whitespace-nowrap">
                        {tx.id}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border whitespace-nowrap ${
                            itemInfo.isIncome
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}
                        >
                          {tx.type || itemInfo.categoryLabel}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-stone-900 leading-snug">{itemInfo.cleanTitle}</div>
                        <div className="text-[11px] text-stone-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                          <span>付款方：<strong className="text-stone-600">{tx.fromUserName || '委託方'}</strong></span>
                          <span>➔</span>
                          <span>收款方：<strong className="text-stone-600">{tx.toUserName || '受款方'}</strong></span>
                          {tx.paymentMethod && <span className="text-stone-400">· 方式：{tx.paymentMethod}</span>}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-xs whitespace-nowrap">
                        <span className={itemInfo.isIncome ? 'text-emerald-600' : 'text-rose-600'}>
                          {itemInfo.amountFormatted}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-stone-500">
                        {tx.note ? (
                          <span className="line-clamp-2" title={tx.note}>{tx.note}</span>
                        ) : (
                          <span className="text-stone-300">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. 官方稽核戳記與法律存證聲明 */}
          <div className="relative p-4 sm:p-5 rounded-2xl bg-amber-50/40 border border-amber-200 text-xs text-stone-600 space-y-1.5 overflow-hidden">
            <div className="font-bold text-amber-950 flex items-center gap-1.5 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>【創點子 IdeaX 官方審計與金流憑證效力】</span>
            </div>
            <p className="leading-relaxed text-[11px]">
              1. 本對帳單係 IdeaX 創點子團隊依據全站資料庫真實交易紀錄彙總產出，具備正式對帳與金流查核效力。
            </p>
            <p className="leading-relaxed text-[11px]">
              2. 款項均經第三方金融信託金流與數位帳本嚴格稽核。專家會員若需報稅憑據或工作室核銷，可直接使用本對帳單。
            </p>
            <p className="leading-relaxed text-[11px] font-mono text-stone-500">
              對帳單查驗代碼：<strong>{statementNo}</strong> · 發行單位：IdeaX 創點子團隊
            </p>

            {/* 圓形紅色官方審計印章 */}
            <div className="absolute right-4 sm:right-8 top-3 w-20 h-20 sm:w-24 sm:h-24 border-2 sm:border-3 border-rose-600 rounded-full flex flex-col items-center justify-center text-rose-600 font-black text-[9px] sm:text-[10px] -rotate-12 opacity-85 pointer-events-none select-none">
              <span>創點子 IdeaX</span>
              <span className="text-[7.5px] sm:text-[8px] my-0.5">財務審計中心</span>
              <span className="text-[7px] sm:text-[7.5px]">結算核訖章</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 bg-white border-t border-stone-200 flex items-center justify-between text-xs shrink-0">
          <span className="text-stone-500 text-[11px]">
            已選 <strong className="text-stone-800">{items.length}</strong> 筆交易 · 合計淨差額{' '}
            <strong className={stats.netBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
              NT$ {stats.netBalance.toLocaleString()}
            </strong>
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold transition-colors cursor-pointer"
            >
              關閉
            </button>
            <button
              type="button"
              onClick={handleDownloadHtml}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>匯出統一對帳單</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

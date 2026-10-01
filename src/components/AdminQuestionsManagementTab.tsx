import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Category, Question } from '../types';
import {
  HelpCircle,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Trash2,
  RotateCcw,
  Tag,
  Clock,
  Coins,
  Send,
  User as UserIcon,
  MessageSquare,
  ShieldAlert,
  Sparkles,
  PieChart as PieChartIcon,
  X,
  ExternalLink,
  ChevronDown,
  RefreshCw,
  UploadCloud,
  DownloadCloud,
  Database,
  Loader2,
} from 'lucide-react';

const CATEGORY_COLORS: Record<Category, { fill: string; hex: string; bg: string; text: string; border: string }> = {
  '創新創業': { fill: 'text-amber-500', hex: '#f59e0b', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  '專業問題': { fill: 'text-blue-500', hex: '#3b82f6', bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200' },
  '學術探討': { fill: 'text-purple-500', hex: '#8b5cf6', bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200' },
  '日常疑難': { fill: 'text-emerald-500', hex: '#10b981', bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
};

const PRESET_VIOLATIONS = [
  '未經許可之商業廣告或外鏈導流',
  '涉及他人隱私、個資或機密未授權揭露',
  '含有不實資訊、詐欺或誤導性內容',
  '仇恨言論、謾罵攻擊或不當騷擾',
  '嚴重侵害第三方著作權或智慧財產權',
  '內容空洞無效或惡意重複洗版',
];

export const AdminQuestionsManagementTab: React.FC = () => {
  const {
    questions,
    addNotification,
    isNoPaymentMode,
    setSelectedQuestion,
    delistQuestion,
    relistQuestion,
    deleteQuestionPermanently,
    purgeExpiredDelistedQuestions,
    pullAllDataFromFirestore,
    syncAllToCloud,
    isFirestoreConnected,
    lastSyncTime,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Delist Modal State
  const [delistingQuestion, setDelistingQuestion] = useState<Question | null>(null);
  const [violationReason, setViolationReason] = useState<string>(PRESET_VIOLATIONS[0]);
  const [adminFeedback, setAdminFeedback] = useState<string>('');
  
  // Permanent Delete Modal State
  const [deletingQuestion, setDeletingQuestion] = useState<Question | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const [feedbackToast, setFeedbackToast] = useState<{ text: string; isError?: boolean } | null>(null);

  // 計算下架保留剩餘天數 (30日倒數)
  const getRetentionDaysLeft = (delistedAt?: string) => {
    if (!delistedAt) return 30;
    const elapsedDays = Math.floor((Date.now() - new Date(delistedAt).getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, 30 - elapsedDays);
  };

  // 統計已逾30日之過期下架項目
  const expiredDelistedCount = useMemo(() => {
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    return questions.filter(
      (q) => q.status === 'delisted' && q.delistedAt && now - new Date(q.delistedAt).getTime() >= THIRTY_DAYS_MS
    ).length;
  }, [questions]);

  // Filtered Questions
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      // 搜尋條件
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = (q.title || '').toLowerCase().includes(query);
        const matchDesc = (q.description || '').toLowerCase().includes(query);
        const matchAuthor = (q.authorName || '').toLowerCase().includes(query);
        const matchId = (q.id || '').toLowerCase().includes(query);
        if (!matchTitle && !matchDesc && !matchAuthor && !matchId) return false;
      }
      // 分類條件
      if (selectedCategory !== 'all' && q.category !== selectedCategory) {
        return false;
      }
      // 狀態條件
      if (selectedStatus !== 'all' && q.status !== selectedStatus) {
        return false;
      }
      return true;
    });
  }, [questions, searchQuery, selectedCategory, selectedStatus]);

  // Statistics & Pie Chart Calculation
  const categoryStats = useMemo(() => {
    const total = questions.length;
    const categories: Category[] = ['創新創業', '專業問題', '學術探討', '日常疑難'];
    
    let cumulativeAngle = 0;
    const slices = categories.map((cat) => {
      const count = questions.filter((q) => q.category === cat).length;
      const percentage = total > 0 ? (count / total) * 100 : 0;
      const startAngle = cumulativeAngle;
      const angle = (percentage / 100) * 360;
      cumulativeAngle += angle;

      return {
        category: cat,
        count,
        percentage: Math.round(percentage),
        startAngle,
        angle,
        color: CATEGORY_COLORS[cat] || { fill: 'text-stone-400', hex: '#a8a29e', bg: 'bg-stone-100', text: 'text-stone-700', border: 'border-stone-200' },
      };
    });

    return { total, slices };
  }, [questions]);

  // Status counts
  const totalCount = questions.length;
  const openCount = questions.filter((q) => q.status === 'open').length;
  const solvedCount = questions.filter((q) => q.status === 'solved').length;
  const delistedCount = questions.filter((q) => q.status === 'delisted').length;

  // Handle Delisting
  const handleConfirmDelist = () => {
    if (!delistingQuestion) return;

    // 執行全站持久化下架與雲端 Firestore 同步
    delistQuestion(delistingQuestion.id, violationReason, adminFeedback.trim() || undefined);

    // Send notification to author
    addNotification({
      title: '⚠️ 提問內容違規下架通知',
      message: `您發布的問題《${delistingQuestion.title.slice(0, 24)}...》因「${violationReason}」已被平台管理員強制下架（下架保留 30 日，逾期將自動從資料庫永久刪除）。處置反饋說明：${
        adminFeedback.trim() || '請恪守 IdeaX 社群規範，如有疑義請聯繫官方團隊。'
      }`,
      type: 'system',
    });

    setFeedbackToast({
      text: `已成功將問題《${delistingQuestion.title.slice(0, 16)}...》違規下架，保留期 30 日，並同步至雲端資料庫！`,
      isError: false,
    });

    setDelistingQuestion(null);
    setAdminFeedback('');
    setTimeout(() => setFeedbackToast(null), 5000);
  };

  // Handle Relisting
  const handleRelistQuestion = (q: Question) => {
    relistQuestion(q.id);

    addNotification({
      title: '🟢 提問已恢復重新上架',
      message: `您的提問《${q.title.slice(0, 24)}...》經管理員審核已恢復正常上架！`,
      type: 'system',
    });

    setFeedbackToast({
      text: `已將問題《${q.title.slice(0, 16)}...》恢復上架招募！`,
      isError: false,
    });
    setTimeout(() => setFeedbackToast(null), 4000);
  };

  // Handle Permanent Delete
  const handleConfirmDelete = async () => {
    if (!deletingQuestion) return;
    setIsDeleting(true);
    try {
      await deleteQuestionPermanently(deletingQuestion.id);
      setFeedbackToast({
        text: `已徹底永久刪除問題《${deletingQuestion.title.slice(0, 16)}...》並自雲端資料庫永久抹除！`,
        isError: false,
      });
      setDeletingQuestion(null);
    } catch (e: any) {
      setFeedbackToast({
        text: `刪除失敗: ${e?.message || '未知錯誤'}`,
        isError: true,
      });
    } finally {
      setIsDeleting(false);
      setTimeout(() => setFeedbackToast(null), 4000);
    }
  };

  // Handle Purge Expired
  const handlePurgeExpired = async () => {
    setIsSyncing(true);
    try {
      const count = await purgeExpiredDelistedQuestions();
      setFeedbackToast({
        text: count > 0 ? `已自動永久清理 ${count} 筆逾 30 日之下架問題！` : '目前無逾 30 日之過期下架項目。',
        isError: false,
      });
    } catch (e: any) {
      setFeedbackToast({
        text: `清理失敗: ${e?.message || '未知錯誤'}`,
        isError: true,
      });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setFeedbackToast(null), 4000);
    }
  };

  // Handle Cloud Sync
  const handleCloudSync = async () => {
    setIsSyncing(true);
    try {
      await pullAllDataFromFirestore();
      setFeedbackToast({
        text: '已成功自 Firebase Cloud Firestore 資料庫拉取最新資料並完成即時雙向校驗！',
        isError: false,
      });
    } catch (e: any) {
      setFeedbackToast({
        text: `同步失敗: ${e?.message || '請檢查網路連線'}`,
        isError: true,
      });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setFeedbackToast(null), 4000);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast 訊息反饋 */}
      {feedbackToast && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 border animate-in fade-in ${
            feedbackToast.isError
              ? 'bg-rose-50 text-rose-900 border-rose-200'
              : 'bg-emerald-50 text-emerald-900 border-emerald-200'
          }`}
        >
          {feedbackToast.isError ? (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
          <span>{feedbackToast.text}</span>
        </div>
      )}

      {/* 頂部標題與雲端資料庫狀態 / 快速排程工具列 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-3.5">
        <div>
          <h3 className="text-base sm:text-lg font-black text-stone-900 flex items-center gap-2 flex-wrap">
            <HelpCircle className="w-5 h-5 text-purple-600" />
            <span>問題管理</span>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-200">
              全站共 {totalCount} 題
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
              下架保留 {delistedCount} 題 (30日保留期)
            </span>
          </h3>
          <p className="text-xs text-stone-500 mt-1">
            全站問題分類統計、違規審查下架（保留 30 日後自動自資料庫永久刪除）、即時雲端同步治理中樞。
          </p>
        </div>

        {/* 雲端資料庫狀態與工具按鈕 */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-stone-100 border border-stone-200 text-[11px] font-bold text-stone-700">
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isFirestoreConnected ? '雲端即時連線' : '本機快取'}</span>
            {lastSyncTime && <span className="text-stone-400 font-mono text-[10px]">({lastSyncTime})</span>}
          </div>

          {/* 一鍵清理逾30日項目 */}
          {expiredDelistedCount > 0 && (
            <button
              type="button"
              disabled={isSyncing}
              onClick={handlePurgeExpired}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="一鍵永久清除所有下架已滿30日之項目"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>清理過期下架 ({expiredDelistedCount})</span>
            </button>
          )}

          {/* 雲端雙向同步 */}
          <button
            type="button"
            disabled={isSyncing}
            onClick={handleCloudSync}
            className="px-3 py-1.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            title="自 Firebase Firestore 即時拉取最新題庫與狀態"
          >
            {isSyncing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 text-purple-600" />
            )}
            <span>即時同步資料庫</span>
          </button>
        </div>
      </div>

      {/* 核心看板：各類問題數量圓餅圖與 KPI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 1. 各類問題數量圓餅圖 */}
        <div className="lg:col-span-2 p-5 rounded-3xl bg-white border border-stone-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-purple-600" />
              <h4 className="font-extrabold text-sm text-stone-900">各類問題數量分佈圓餅圖</h4>
            </div>
            <span className="text-[11px] text-stone-400 font-mono">實時分類統計</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 justify-around pt-1">
            {/* SVG Donut / Pie Chart */}
            <div className="relative w-40 h-40 shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                {categoryStats.slices.map((slice) => {
                  if (slice.count === 0) return null;
                  const strokeDasharray = `${(slice.percentage * 2 * Math.PI * 35) / 100} ${2 * Math.PI * 35}`;
                  const strokeDashoffset = -((slice.startAngle * 2 * Math.PI * 35) / 360);
                  return (
                    <circle
                      key={slice.category}
                      cx="50"
                      cy="50"
                      r="35"
                      fill="transparent"
                      stroke={slice.color.hex}
                      strokeWidth="18"
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      className="transition-all duration-500 hover:opacity-85 cursor-pointer"
                      onClick={() => setSelectedCategory(selectedCategory === slice.category ? 'all' : slice.category)}
                    >
                      <title>{`${slice.category}: ${slice.count} 題 (${slice.percentage}%)`}</title>
                    </circle>
                  );
                })}
              </svg>
              {/* Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-stone-900 font-mono leading-none">
                  {totalCount}
                </span>
                <span className="text-[10px] text-stone-400 font-bold mt-1">問題總數</span>
              </div>
            </div>

            {/* 图例與佔比 Legend */}
            <div className="grid grid-cols-2 gap-2.5 w-full sm:max-w-xs">
              {categoryStats.slices.map((s) => {
                const isSelected = selectedCategory === s.category;
                return (
                  <button
                    key={s.category}
                    type="button"
                    onClick={() => setSelectedCategory(isSelected ? 'all' : s.category)}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-purple-600 bg-purple-50/60 ring-2 ring-purple-200'
                        : 'border-stone-100 hover:border-stone-200 bg-stone-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color.hex }} />
                      <span className="text-xs font-bold text-stone-800 truncate">{s.category}</span>
                    </div>
                    <div className="flex items-baseline justify-between text-[11px] text-stone-500 font-mono">
                      <span className="font-extrabold text-stone-900">{s.count} 題</span>
                      <span>{s.percentage}%</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 2. 狀態指標卡 */}
        <div className="p-5 rounded-3xl bg-white border border-stone-200 shadow-2xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h4 className="font-extrabold text-sm text-stone-900">狀態總覽與下架保留</h4>
            <span className="text-[10px] text-stone-400 font-mono">30日自動清除機制</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <button
              type="button"
              onClick={() => setSelectedStatus(selectedStatus === 'open' ? 'all' : 'open')}
              className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                selectedStatus === 'open'
                  ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200'
                  : 'border-stone-100 bg-stone-50/50 hover:bg-stone-100/70'
              }`}
            >
              <span className="text-[10px] text-stone-500 font-bold block">招募中</span>
              <span className="text-lg font-black text-emerald-700 font-mono">{openCount}</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedStatus(selectedStatus === 'solved' ? 'all' : 'solved')}
              className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                selectedStatus === 'solved'
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                  : 'border-stone-100 bg-stone-50/50 hover:bg-stone-100/70'
              }`}
            >
              <span className="text-[10px] text-stone-500 font-bold block">已結案</span>
              <span className="text-lg font-black text-blue-700 font-mono">{solvedCount}</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedStatus(selectedStatus === 'delisted' ? 'all' : 'delisted')}
              className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                selectedStatus === 'delisted'
                  ? 'border-rose-500 bg-rose-50 ring-2 ring-rose-200'
                  : 'border-rose-100 bg-rose-50/40 hover:bg-rose-100/60'
              }`}
            >
              <span className="text-[10px] text-rose-600 font-bold block">違規下架</span>
              <span className="text-lg font-black text-rose-700 font-mono">{delistedCount}</span>
            </button>
          </div>

          <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-[11px] text-amber-900 leading-relaxed">
            <span className="font-bold block mb-0.5">📌 平台下架保留與永久刪除守則：</span>
            被管理員強制違規下架之問題，將保留於本管理專區 <strong>30 日</strong>。滿 30 日後系統自動執行永久刪除並自資料庫徹底抹除。管理員亦可於下方手動提前執行「立即永久刪除」。
          </div>
        </div>
      </div>

      {/* 搜尋與篩選列 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50 p-4 rounded-3xl border border-stone-200">
        {/* 關鍵字搜尋 */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜尋問題標題、內文、提問者姓名或問題 ID..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-stone-200 rounded-2xl text-xs text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-purple-600 shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* 分類與狀態篩選 */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* 分類下拉 */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-white border border-stone-200 rounded-2xl text-xs text-stone-700 font-bold focus:outline-none focus:border-purple-600 shadow-2xs cursor-pointer"
          >
            <option value="all">全部分類</option>
            <option value="創新創業">創新創業</option>
            <option value="專業問題">專業問題</option>
            <option value="學術探討">學術探討</option>
            <option value="日常疑難">日常疑難</option>
          </select>

          {/* 狀態下拉 */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-white border border-stone-200 rounded-2xl text-xs text-stone-700 font-bold focus:outline-none focus:border-purple-600 shadow-2xs cursor-pointer"
          >
            <option value="all">全部狀態</option>
            <option value="open">招募中</option>
            <option value="solved">已結案</option>
            <option value="delisted">違規下架 (保留30日)</option>
          </select>

          {(searchQuery || selectedCategory !== 'all' || selectedStatus !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setSelectedStatus('all');
              }}
              className="px-2.5 py-1.5 rounded-xl border border-stone-200 text-stone-500 hover:bg-stone-200 text-xs font-bold whitespace-nowrap cursor-pointer"
            >
              清除篩選
            </button>
          )}
        </div>
      </div>

      {/* 問題列表 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-stone-500 px-1">
          <span>共找到 <strong>{filteredQuestions.length}</strong> 筆問題</span>
          <span>按發布時間排序</span>
        </div>

        {filteredQuestions.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-stone-200 text-stone-400 space-y-2">
            <HelpCircle className="w-8 h-8 text-stone-300 mx-auto" />
            <p className="text-xs font-bold">查無相符的問題記錄</p>
            <span className="text-[11px]">請嘗試更換搜尋關鍵字或分類狀態篩選條件。</span>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredQuestions.map((q) => {
              const catColor = CATEGORY_COLORS[q.category] || { hex: '#888', bg: 'bg-stone-100', text: 'text-stone-700', border: 'border-stone-200' };
              const isDelisted = q.status === 'delisted';
              const daysLeft = isDelisted ? getRetentionDaysLeft(q.delistedAt) : 30;

              return (
                <div
                  key={q.id}
                  className={`p-4 rounded-2xl bg-white border transition-all ${
                    isDelisted
                      ? 'border-rose-300 bg-rose-50/20'
                      : 'border-stone-200 hover:border-purple-300 hover:shadow-2xs'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* 狀態標籤 */}
                        {isDelisted ? (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3" />
                            違規已下架
                          </span>
                        ) : q.status === 'solved' ? (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                            已結案
                          </span>
                        ) : (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                            招募中
                          </span>
                        )}

                        {/* 分類 */}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${catColor.bg} ${catColor.text} border ${catColor.border}`}>
                          {q.category}
                        </span>

                        {/* 懸賞點數 */}
                        {!isNoPaymentMode && q.bounty > 0 ? (
                          <span className="text-[10px] font-black font-mono px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                            NT$ {q.bounty.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
                            免費交流
                          </span>
                        )}

                        <span className="text-[10px] text-stone-400 font-mono">ID: {q.id}</span>
                      </div>

                      {/* 標題 */}
                      <h4 className="font-extrabold text-sm text-stone-900 hover:text-purple-700 transition-colors line-clamp-1">
                        {q.title}
                      </h4>

                      {/* 提問者與 Meta 資訊 */}
                      <div className="flex items-center gap-3 text-[11px] text-stone-500 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <img
                            src={q.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                            alt=""
                            className="w-4 h-4 rounded-full object-cover"
                          />
                          <span className="font-bold text-stone-700">{q.authorName}</span>
                        </div>
                        <span>•</span>
                        <span>{q.createdAt}</span>
                        <span>•</span>
                        <span>{q.answersCount || 0} 則解答</span>
                        <span>•</span>
                        <span>{q.views || 0} 次瀏覽</span>
                      </div>

                      {/* 違規下架事由與 30 日保留倒數 */}
                      {isDelisted && (
                        <div className="mt-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1.5">
                          <div className="flex items-center justify-between flex-wrap gap-1">
                            <div className="flex items-center gap-1.5 font-bold text-rose-950">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              <span>下架事由：{q.delistedReason || '違反平台內容審核守則'}</span>
                            </div>
                            <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-rose-200/80 text-rose-950 border border-rose-300">
                              ⏳ 保留剩餘 {daysLeft} 天（30日後自動自資料庫永久刪除）
                            </span>
                          </div>
                          {q.delistedFeedback && (
                            <p className="text-[11px] text-rose-800 pl-5">
                              <strong>管理員反饋意見：</strong>{q.delistedFeedback}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 操作按鈕群 */}
                    <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100 flex-wrap">
                      {/* 預覽問題 */}
                      <button
                        type="button"
                        onClick={() => setSelectedQuestion(q)}
                        className="px-3 py-1.5 rounded-xl border border-stone-200 hover:border-purple-300 hover:bg-purple-50 text-stone-700 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        title="查閱問題詳細內容"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>檢視</span>
                      </button>

                      {/* 下架 / 恢復上架 / 永久刪除 */}
                      {isDelisted ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleRelistQuestion(q)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                            title="撤銷違規標記並恢復上架"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>恢復上架</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingQuestion(q)}
                            className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-rose-700 text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                            title="強制自雲端 Firestore 與全站永久刪除"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-300" />
                            <span>永久刪除</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setDelistingQuestion(q);
                              setViolationReason(PRESET_VIOLATIONS[0]);
                              setAdminFeedback('');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                            title="違規下架該問題並發送反饋通知（保留30日）"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>違規下架</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingQuestion(q)}
                            className="p-1.5 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                            title="永久刪除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 違規下架與用戶反饋 Modal */}
      {delistingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <ShieldAlert className="w-5 h-5" />
                <h4 className="font-black text-base text-stone-900">違規問題下架與處置反饋</h4>
              </div>
              <button
                type="button"
                onClick={() => setDelistingQuestion(null)}
                className="p-1 rounded-lg text-stone-400 hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 問題概要預覽 */}
            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 text-xs space-y-1">
              <span className="text-[10px] text-stone-400 font-bold block">處置對象問題：</span>
              <p className="font-extrabold text-stone-900 line-clamp-1">{delistingQuestion.title}</p>
              <div className="flex items-center gap-2 text-stone-500 text-[11px] pt-1">
                <span>提問用戶：<strong className="text-stone-800">{delistingQuestion.authorName}</strong></span>
                <span>•</span>
                <span>分類：{delistingQuestion.category}</span>
              </div>
            </div>

            {/* 違規原因快選 */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-800 flex items-center justify-between">
                <span>選擇主要違規事由：</span>
                <span className="text-[10px] text-rose-600 font-bold">*必填</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {PRESET_VIOLATIONS.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setViolationReason(reason)}
                    className={`p-2 rounded-xl text-xs text-left transition-all cursor-pointer flex items-center gap-1.5 ${
                      violationReason === reason
                        ? 'bg-rose-600 text-white font-bold shadow-2xs'
                        : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200'
                    }`}
                  >
                    <span className="truncate">{reason}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 管理員反饋意見輸入 */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-800 flex items-center justify-between">
                <span>給予提問者之處置說明與改善反饋（將發送系統通知）：</span>
                <span className="text-[10px] text-stone-400">可選填具體處置建議</span>
              </label>
              <textarea
                rows={3}
                value={adminFeedback}
                onChange={(e) => setAdminFeedback(e.target.value)}
                placeholder="例如：提問內文中包含未授權之外部商業微信群與導流連結，違反平台社群守則第 3 條。請修改去除導流內容後聯繫官方申訴恢復上架。"
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl text-xs text-stone-800 focus:outline-none focus:border-rose-600 focus:bg-white resize-none"
              />
            </div>

            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
              ℹ️ <strong>下架保留政策：</strong>下架後將保留 30 日於管理員問題管理專區供追蹤申訴，滿 30 日將自動從資料庫永久刪除。
            </div>

            {/* 底部按鈕 */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setDelistingQuestion(null)}
                className="px-4 py-2 rounded-xl border border-stone-200 text-stone-700 text-xs font-bold hover:bg-stone-100 cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmDelist}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black transition-all cursor-pointer shadow-md flex items-center gap-1.5"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>確認下架並發送反饋通知</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 永久刪除確認 Modal */}
      {deletingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-rose-200">
            <div className="flex items-center justify-between border-b border-rose-100 pb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <Trash2 className="w-5 h-5" />
                <h4 className="font-black text-base text-stone-900">永久刪除問題確認</h4>
              </div>
              <button
                type="button"
                onClick={() => setDeletingQuestion(null)}
                className="p-1 rounded-lg text-stone-400 hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1.5">
              <p className="font-extrabold line-clamp-2">{deletingQuestion.title}</p>
              <span className="text-[10px] text-rose-700 font-mono block">ID: {deletingQuestion.id} · 提問者: {deletingQuestion.authorName}</span>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              ⚠️ <strong>警告：</strong>此操作將從平台與 <strong>Firebase Cloud Firestore 雲端資料庫</strong> 同步<strong>永久抹除</strong>此問題及其關聯提案，<strong>此操作不可逆</strong>，該問題將永不再出現。
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingQuestion(null)}
                className="px-4 py-2 rounded-xl border border-stone-200 text-stone-700 text-xs font-bold hover:bg-stone-100 cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-xl bg-rose-700 hover:bg-rose-600 text-white text-xs font-black transition-all cursor-pointer shadow-md flex items-center gap-1.5 disabled:opacity-60"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>抹除中...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>確認永久刪除</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

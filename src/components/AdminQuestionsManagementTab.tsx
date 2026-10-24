import React, { useState, useMemo } from 'react';
import { usePagedList, ShowMoreButton } from './ShowMoreList';
import { formatDateTime } from '../utils/formatDateTime';
import { useApp } from '../context/AppContext';
import { Category, Question } from '../types';
import { isSimulatedQuestion, SIMULATED_BATCH_ID } from '../data/virtualProposalsSeed';
import { AdminQuickOnboardAppModal } from './AdminQuickOnboardAppModal';
import { AdminTransferWorkOwnershipModal } from './AdminTransferWorkOwnershipModal';
import { AdminConvertWorkTypeModal } from './AdminConvertWorkTypeModal';
import { UpdateProposalModal } from './UpdateProposalModal';
import { isPainPointQuestion, isL0DiscussionQuestion } from '../utils/questionUtils';
import { isPlatformPublishedWork } from '../utils/userDisplay';
import {
  HelpCircle,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Edit3,
  Trash2,
  RotateCcw,
  Tag,
  Clock,
  Coins,
  Send,
  User as UserIcon,
  UserCheck,
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
  ArrowLeftRight,
} from 'lucide-react';

const CATEGORY_COLORS: Record<Category, { fill: string; hex: string; bg: string; text: string; border: string }> = {
  '創新創業': { fill: 'text-amber-500', hex: '#f59e0b', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-stone-200' },
  '專業問題': { fill: 'text-blue-500', hex: '#3b82f6', bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-stone-200' },
  '學術探討': { fill: 'text-purple-500', hex: '#8b5cf6', bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-stone-200' },
  '日常疑難': { fill: 'text-emerald-500', hex: '#10b981', bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-stone-200' },
  '網站程式': { fill: 'text-indigo-500', hex: '#6366f1', bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-stone-200' },
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
    batchDelistQuestions,
    relistQuestion,
    deleteQuestionPermanently,
    deleteQuestionsBatchPermanently,
    batchSetFeaturedQuestions,
    purgeExpiredDelistedQuestions,
    pullAllDataFromFirestore,
    syncAllToCloud,
    isFirestoreConnected,
    lastSyncTime,
    isSimulatedDataPurged,
    purgeAllSimulatedData,
    restoreAllSimulatedData,
    simulatedStats,
    showCenterToast,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPostType, setSelectedPostType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'latest' | 'oldest' | 'views' | 'likes' | 'bounty' | 'delisted_countdown'>('latest');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<'all' | 'real' | 'simulated'>('all');
  const [confirmPurgeSimulatedModal, setConfirmPurgeSimulatedModal] = useState(false);
  const [isOnboardModalOpen, setIsOnboardModalOpen] = useState(false);
  const [transferringQuestion, setTransferringQuestion] = useState<Question | null>(null);
  const [editingProposalQuestion, setEditingProposalQuestion] = useState<Question | null>(null);

  // 批次多選狀態與彈窗
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);
  const [isBatchDelistModalOpen, setIsBatchDelistModalOpen] = useState(false);
  const [isBatchTransferModalOpen, setIsBatchTransferModalOpen] = useState(false);
  const [convertingQuestion, setConvertingQuestion] = useState<Question | null>(null);
  const [isBatchConvertModalOpen, setIsBatchConvertModalOpen] = useState(false);
  const [batchDelistReason, setBatchDelistReason] = useState<string>(PRESET_VIOLATIONS[0]);
  const [batchDelistFeedback, setBatchDelistFeedback] = useState<string>('');
  const [batchFeaturedDropdownOpen, setBatchFeaturedDropdownOpen] = useState(false);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  // Delist Modal State
  const [delistingQuestion, setDelistingQuestion] = useState<Question | null>(null);
  const [violationReason, setViolationReason] = useState<string>(PRESET_VIOLATIONS[0]);
  const [adminFeedback, setAdminFeedback] = useState<string>('');
  
  // Permanent Delete Modal State
  const [deletingQuestion, setDeletingQuestion] = useState<Question | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const [feedbackToast, setFeedbackToast] = useState<{ text: string; isError?: boolean } | null>(null);

  // 計算下架保留剩餘天數 (7日倒數)
  const getRetentionDaysLeft = (delistedAt?: string) => {
    if (!delistedAt) return 7;
    const elapsedDays = Math.floor((Date.now() - new Date(delistedAt).getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, 7 - elapsedDays);
  };

  // 統計已逾7日之過期下架項目
  const expiredDelistedCount = useMemo(() => {
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    return questions.filter(
      (q) => q.status === 'delisted' && q.delistedAt && now - new Date(q.delistedAt).getTime() >= SEVEN_DAYS_MS
    ).length;
  }, [questions]);

  // 安全解析時間戳記，支援 ISO、字串、數字與 Firestore 物件
  const safeParseTime = (val: any): number => {
    if (!val) return 0;
    if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
    if (typeof val === 'object') {
      if (typeof val.toMillis === 'function') return val.toMillis();
      if (typeof val.toDate === 'function') return val.toDate().getTime();
      if (typeof val.seconds === 'number') return val.seconds * 1000;
    }
    if (typeof val === 'string') {
      const parsed = new Date(val).getTime();
      if (Number.isFinite(parsed)) return parsed;
      const fallback = new Date(val.replace(/\//g, '-')).getTime();
      if (Number.isFinite(fallback)) return fallback;
    }
    return 0;
  };

  // Filtered Questions with Sorting & Classification (預設最新排序)
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      // 搜尋條件
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = (q.title || '').toLowerCase().includes(query);
        const matchDesc = (q.description || '').toLowerCase().includes(query);
        const matchAuthor = (q.authorName || '').toLowerCase().includes(query);
        const matchId = (q.id || '').toLowerCase().includes(query);
        const matchAppName = (q.appName || '').toLowerCase().includes(query);
        if (!matchTitle && !matchDesc && !matchAuthor && !matchId && !matchAppName) return false;
      }
      // 貼文類型篩選
      if (selectedPostType !== 'all') {
        if (selectedPostType === 'pain_point' && q.postType !== 'pain_point') return false;
        if (selectedPostType === 'innovation_proposal' && q.postType !== 'innovation_proposal') return false;
        if (selectedPostType === 'vibecoding_app' && q.postType !== 'vibecoding_app') return false;
        if (selectedPostType === 'chat_discussion' && q.postType !== 'chat_discussion') return false;
        if (selectedPostType === 'seek_solution' && (q.postType && q.postType !== 'seek_solution')) return false;
      }
      // 分類條件
      if (selectedCategory !== 'all') {
        if (q.category !== selectedCategory && q.subcategory !== selectedCategory) {
          return false;
        }
      }
      // 狀態條件
      if (selectedStatus !== 'all' && q.status !== selectedStatus) {
        return false;
      }
      // 資料來源區隔條件（真實 vs 模擬）
      const isSim = isSimulatedQuestion(q);
      if (selectedSource === 'real' && isSim) return false;
      if (selectedSource === 'simulated' && !isSim) return false;
      return true;
    }).sort((a, b) => {
      if (sortBy === 'latest') {
        const timeB = safeParseTime(b.createdAt);
        const timeA = safeParseTime(a.createdAt);
        if (timeB !== timeA) return timeB - timeA;
        return (b.id || '').localeCompare(a.id || '');
      }
      if (sortBy === 'oldest') {
        const timeB = safeParseTime(b.createdAt);
        const timeA = safeParseTime(a.createdAt);
        if (timeA !== timeB) return timeA - timeB;
        return (a.id || '').localeCompare(b.id || '');
      }
      if (sortBy === 'views') {
        const diff = (b.views || 0) - (a.views || 0);
        if (diff !== 0) return diff;
        return safeParseTime(b.createdAt) - safeParseTime(a.createdAt);
      }
      if (sortBy === 'likes') {
        const scoreA = (a.likes || 0) + (a.secondedCount || 0);
        const scoreB = (b.likes || 0) + (b.secondedCount || 0);
        if (scoreB !== scoreA) return scoreB - scoreA;
        return safeParseTime(b.createdAt) - safeParseTime(a.createdAt);
      }
      if (sortBy === 'bounty') {
        const diff = (b.bounty || 0) - (a.bounty || 0);
        if (diff !== 0) return diff;
        return safeParseTime(b.createdAt) - safeParseTime(a.createdAt);
      }
      if (sortBy === 'delisted_countdown') {
        const leftA = getRetentionDaysLeft(a.delistedAt);
        const leftB = getRetentionDaysLeft(b.delistedAt);
        if (leftA !== leftB) return leftA - leftB;
        return safeParseTime(b.createdAt) - safeParseTime(a.createdAt);
      }
      return 0;
    });
  }, [questions, searchQuery, selectedCategory, selectedStatus, selectedSource, selectedPostType, sortBy]);

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
      title: ' 提問內容違規下架通知',
      message: `您發布的問題《${delistingQuestion.title.slice(0, 24)}...》因「${violationReason}」已被平台管理員強制下架（下架暫存保留 7 日，逾期將自動從資料庫永久刪除）。處置反饋說明：${
        adminFeedback.trim() || '請恪守 IdeaX 社群規範，如有疑義請聯繫官方團隊。'
      }`,
      type: 'system',
    });

    setFeedbackToast({
      text: `已成功將問題《${delistingQuestion.title.slice(0, 16)}...》違規下架，暫存保留期 7 日，期間可自問題或提案恢復或永久抹除！`,
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
      title: ' 提問已恢復重新上架',
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
        text: count > 0 ? `已自動永久清理 ${count} 筆逾 7 日之過期下架問題！` : '目前無逾 7 日之過期下架項目。',
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

  // 批次選取與操作項目清單
  const selectedQuestionsList = useMemo(() => {
    return questions.filter((q) => selectedIds.has(q.id));
  }, [questions, selectedIds]);

  const isAllFilteredSelected = filteredQuestions.length > 0 && filteredQuestions.every((q) => selectedIds.has(q.id));
  const isSomeFilteredSelected = filteredQuestions.some((q) => selectedIds.has(q.id));

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredQuestions.map((q) => q.id)));
    }
  };

  // 執行批次刪除
  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsBatchProcessing(true);
    try {
      const ids = Array.from(selectedIds);
      const count = await deleteQuestionsBatchPermanently(ids);
      setFeedbackToast({
        text: `已徹底永久刪除選取的 ${count} 筆問題/作品，並自雲端資料庫永久抹除！`,
        isError: false,
      });
      setIsBatchDeleteModalOpen(false);
      setSelectedIds(new Set());
    } catch (err: any) {
      setFeedbackToast({
        text: `批次刪除失敗: ${err?.message || '未知錯誤'}`,
        isError: true,
      });
    } finally {
      setIsBatchProcessing(false);
      setTimeout(() => setFeedbackToast(null), 4000);
    }
  };

  // 執行批次下架
  const handleBatchDelist = async () => {
    if (selectedIds.size === 0) return;
    setIsBatchProcessing(true);
    try {
      const ids = Array.from(selectedIds);
      await batchDelistQuestions(ids, batchDelistReason, batchDelistFeedback.trim() || undefined);
      setFeedbackToast({
        text: `已成功將選取的 ${ids.length} 筆項目批次違規下架，移入 7 日暫存保留期！`,
        isError: false,
      });
      setIsBatchDelistModalOpen(false);
      setSelectedIds(new Set());
      setBatchDelistFeedback('');
    } catch (err: any) {
      setFeedbackToast({
        text: `批次下架失敗: ${err?.message || '未知錯誤'}`,
        isError: true,
      });
    } finally {
      setIsBatchProcessing(false);
      setTimeout(() => setFeedbackToast(null), 4000);
    }
  };

  // 執行批次精選 / 取消精選
  const handleBatchFeatured = async (isFeatured: boolean) => {
    if (selectedIds.size === 0) return;
    setIsBatchProcessing(true);
    try {
      const ids = Array.from(selectedIds);
      await batchSetFeaturedQuestions(ids, isFeatured);
      setFeedbackToast({
        text: isFeatured
          ? `已成功將選取的 ${ids.length} 筆項目設為【精選推薦】！`
          : `已取消選取的 ${ids.length} 筆項目的【精選推薦】標記！`,
        isError: false,
      });
      setBatchFeaturedDropdownOpen(false);
    } catch (err: any) {
      setFeedbackToast({
        text: `批次精選設定失敗: ${err?.message || '未知錯誤'}`,
        isError: true,
      });
    } finally {
      setIsBatchProcessing(false);
      setTimeout(() => setFeedbackToast(null), 4000);
    }
  };

  // 開啟批次轉移所有權
  const handleOpenBatchTransfer = () => {
    if (selectedIds.size === 0) return;
    setIsBatchTransferModalOpen(true);
  };

  const handleBatchTransferSuccess = (updatedList: Question[]) => {
    setFeedbackToast({
      text: `已成功將 ${updatedList.length} 筆作品之所有權批次轉移完成！`,
      isError: false,
    });
    setIsBatchTransferModalOpen(false);
    setSelectedIds(new Set());
    setTimeout(() => setFeedbackToast(null), 4000);
  };

  const pagedQuestions = usePagedList(filteredQuestions, 20);
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast 訊息反饋 */}
      {feedbackToast && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 border animate-in fade-in ${
            feedbackToast.isError
              ? 'bg-rose-50 text-rose-900 border-stone-200'
              : 'bg-emerald-50 text-emerald-900 border-stone-200'
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
          <h3 className="text-base sm:text-lg font-semibold text-stone-900 flex items-center gap-2 flex-wrap">
            <HelpCircle className="w-5 h-5 text-purple-600" />
            <span>問題或提案</span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-stone-200">
              全站共 {totalCount} 題
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-stone-200">
              下架/暫存 {delistedCount} 題 (7日暫存期)
            </span>
          </h3>
          <p className="text-xs text-stone-500 mt-1">
            全站問題分類統計、違規審查下架與刪除（暫存保留 7 日，期間可恢復，過後永久抹除）、即時雲端同步治理中樞。
          </p>
        </div>

        {/* 雲端資料庫狀態與工具按鈕 */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {/* ⚡ 網址智慧上架軟體網站 */}
          <button
            type="button"
            onClick={() => setIsOnboardModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:shadow-md active:scale-95 border border-purple-500/30"
            title="貼上網站網址，AI 自動讀取名稱、標題、簡述並以首頁為封面，快速上架至「軟體作品」專區"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span>⚡ 網址智慧上架</span>
          </button>

          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-stone-100 border border-stone-200 text-[11px] font-bold text-stone-700">
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isFirestoreConnected ? '雲端即時連線' : '本機快取'}</span>
            {lastSyncTime && <span className="text-stone-400 tabular-nums text-[11px]">({lastSyncTime})</span>}
          </div>

          {/* 一鍵清理逾7日項目 */}
          {expiredDelistedCount > 0 && (
            <button
              type="button"
              disabled={isSyncing}
              onClick={handlePurgeExpired}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="一鍵永久清除所有下架已滿7日之項目"
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
            className="px-3 py-1.5 rounded-xl border border-stone-200 bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
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

      {/* 模擬帳號 / 模擬貼文 / 模擬數據 標籤區隔與一鍵清除控制列 */}
      <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-200/80 text-amber-950 border border-stone-200">
               模擬數據批次標籤：{SIMULATED_BATCH_ID}
            </span>
            <span className="text-xs font-semibold text-stone-900">
              模擬資料與真實資料嚴格區隔治理
            </span>
            {isSimulatedDataPurged ? (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                ✓ 已全數清除模擬資料（純真實數據狀態）
              </span>
            ) : (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white text-amber-900 border border-stone-200">
                目前含模擬帳號 {simulatedStats.simulatedUsersCount} 位 • 模擬貼文 {simulatedStats.simulatedQuestionsCount} 篇 • 模擬討論 {simulatedStats.simulatedAnswersCount} 則
              </span>
            )}
          </div>
          <p className="text-[11px] text-stone-600">
            所有模擬帳號、模擬痛點/方案、模擬討論留言與模擬打賞均帶有 <code className="tabular-nums bg-white px-1 py-0.5 rounded border border-stone-200">isSimulated: true</code> 與批次標記，可隨時一鍵自本機與雲端 Firestore 資料庫徹底刪除，絕不影響真實註冊會員與真實貼文。
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {!isSimulatedDataPurged ? (
            <button
              type="button"
              disabled={isSyncing}
              onClick={() => setConfirmPurgeSimulatedModal(true)}
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>一鍵刪除全部模擬資料</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={isSyncing}
              onClick={async () => {
                setIsSyncing(true);
                try {
                  await restoreAllSimulatedData();
                  setFeedbackToast({
                    text: '已成功還原所有模擬帳號、模擬貼文與討論留言並同步至雲端資料庫！',
                    isError: false,
                  });
                } finally {
                  setIsSyncing(false);
                  setTimeout(() => setFeedbackToast(null), 4000);
                }
              }}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>還原預設模擬資料</span>
            </button>
          )}
        </div>
      </div>

      {/* 核心看板：各類問題數量圓餅圖與 KPI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 1. 各類問題數量圓餅圖 */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-purple-600" />
              <h4 className="font-semibold text-sm text-stone-900">各類問題數量分佈圓餅圖</h4>
            </div>
            <span className="text-[11px] text-stone-400 tabular-nums">實時分類統計</span>
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
                <span className="text-2xl font-semibold text-stone-900 tabular-nums leading-none">
                  {totalCount}
                </span>
                <span className="text-[11px] text-stone-400 font-bold mt-1">問題總數</span>
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
                        ? 'border-purple-600 bg-stone-50 ring-2 ring-purple-200'
                        : 'border-stone-100 hover:border-stone-200 bg-stone-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color.hex }} />
                      <span className="text-xs font-bold text-stone-800 truncate">{s.category}</span>
                    </div>
                    <div className="flex items-baseline justify-between text-[11px] text-stone-500 tabular-nums">
                      <span className="font-semibold text-stone-900">{s.count} 題</span>
                      <span>{s.percentage}%</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 2. 狀態指標卡 */}
        <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h4 className="font-semibold text-sm text-stone-900">狀態總覽與下架保留</h4>
            <span className="text-[11px] text-stone-400 tabular-nums">30日自動清除機制</span>
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
              <span className="text-[11px] text-stone-500 font-bold block">招募中</span>
              <span className="text-lg font-semibold text-emerald-700 tabular-nums">{openCount}</span>
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
              <span className="text-[11px] text-stone-500 font-bold block">已結案</span>
              <span className="text-lg font-semibold text-blue-700 tabular-nums">{solvedCount}</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedStatus(selectedStatus === 'delisted' ? 'all' : 'delisted')}
              className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                selectedStatus === 'delisted'
                  ? 'border-rose-500 bg-rose-50 ring-2 ring-rose-200'
                  : 'border-stone-200 bg-stone-50 hover:bg-stone-50'
              }`}
            >
              <span className="text-[11px] text-rose-600 font-bold block">違規下架</span>
              <span className="text-lg font-semibold text-rose-700 tabular-nums">{delistedCount}</span>
            </button>
          </div>

          <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 text-[11px] text-amber-900 leading-relaxed">
            <span className="font-bold block mb-0.5"> 平台下架/刪除暫存與永久抹除守則：</span>
            被管理員違規下架或刪除之問題，將暫存保留於本管理專區 <strong>7 日</strong>。期間管理員可隨時執行「恢復上架」；滿 7 日後系統自動執行永久刪除並自資料庫徹底抹除。管理員亦可於下方手動提前執行「立即永久刪除」。
          </div>
        </div>
      </div>

      {/* 搜尋與篩選列 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50 p-4 rounded-2xl border border-stone-200">
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
          {/* 貼文類型篩選 */}
          <select
            value={selectedPostType}
            onChange={(e) => setSelectedPostType(e.target.value)}
            className="px-3 py-2 bg-white border border-stone-200 rounded-2xl text-xs text-stone-700 font-bold focus:outline-none focus:border-purple-600 shadow-2xs cursor-pointer"
          >
            <option value="all">全部貼文類型</option>
            <option value="pain_point">🔥 痛點需求</option>
            <option value="innovation_proposal">💡 創新提案</option>
            <option value="vibecoding_app">🚀 軟體作品</option>
            <option value="seek_solution">💰 懸賞問題</option>
            <option value="chat_discussion">💬 閒聊討論</option>
          </select>

          {/* 分類下拉 */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-white border border-stone-200 rounded-2xl text-xs text-stone-700 font-bold focus:outline-none focus:border-purple-600 shadow-2xs cursor-pointer"
          >
            <option value="all">全部分類</option>
            <optgroup label="主領域">
              <option value="創新創業">創新創業</option>
              <option value="網站程式">軟體作品 / 網站程式</option>
              <option value="專業問題">專業問題</option>
              <option value="學術探討">學術探討</option>
              <option value="日常疑難">日常疑難</option>
            </optgroup>
            <optgroup label="軟體子領域">
              <option value="遊戲">遊戲</option>
              <option value="AI工具">AI工具</option>
              <option value="網站程式">網站程式</option>
              <option value="自動化">自動化</option>
              <option value="擴充功能">擴充功能</option>
            </optgroup>
            <optgroup label="創新提案領域">
              <option value="資通訊">資通訊</option>
              <option value="機電運輸">機電運輸</option>
              <option value="生醫化材">生醫化材</option>
              <option value="服務文創">服務文創</option>
            </optgroup>
          </select>

          {/* 資料來源篩選（真實 vs 模擬） */}
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value as 'all' | 'real' | 'simulated')}
            className="px-3 py-2 bg-white border border-stone-200 rounded-2xl text-xs text-stone-700 font-bold focus:outline-none focus:border-purple-600 shadow-2xs cursor-pointer"
          >
            <option value="all">全部來源 (真實 + 模擬)</option>
            <option value="real"> 僅真實貼文</option>
            <option value="simulated"> 僅模擬資料 ({simulatedStats.simulatedQuestionsCount})</option>
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
            <option value="delisted">違規下架 (保留7日)</option>
          </select>

          {(searchQuery || selectedCategory !== 'all' || selectedStatus !== 'all' || selectedSource !== 'all' || selectedPostType !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setSelectedPostType('all');
                setSelectedStatus('all');
                setSelectedSource('all');
                setSortBy('latest');
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
        <div className="flex items-center justify-between text-xs text-stone-500 px-1 gap-2 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            {/* 全選核取方塊 */}
            <label className="flex items-center gap-2 font-bold text-stone-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isAllFilteredSelected}
                ref={(input) => {
                  if (input) {
                    input.indeterminate = !isAllFilteredSelected && isSomeFilteredSelected;
                  }
                }}
                onChange={toggleSelectAllFiltered}
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-stone-300 cursor-pointer"
              />
              <span>全選目前篩選結果</span>
            </label>

            <span>
              共 <strong>{filteredQuestions.length}</strong> 筆問題或提案
            </span>

            {selectedIds.size > 0 && (
              <div className="flex items-center gap-1.5 pl-2 border-l border-stone-300">
                <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 font-bold text-[11px]">
                  已選 {selectedIds.size} 筆
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="text-[11px] text-stone-500 hover:text-stone-800 underline cursor-pointer"
                >
                  清除選取
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-[11px] font-bold text-stone-600">排序方式：</span>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="px-2.5 py-1 rounded-xl bg-white border border-stone-200 text-xs font-bold text-stone-800 shadow-2xs focus:outline-none focus:border-purple-600 cursor-pointer"
            >
              <option value="latest">最新發布（新到舊 / 預設）</option>
              <option value="oldest">最早發布（舊到新）</option>
              <option value="views">最多瀏覽次數</option>
              <option value="likes">最多附議 / Like</option>
              <option value="bounty">最高懸賞點數</option>
              <option value="delisted_countdown">違規下架倒數（天數少先）</option>
            </select>
          </div>
        </div>

        {filteredQuestions.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-stone-200 text-stone-400 space-y-2">
            <HelpCircle className="w-8 h-8 text-stone-300 mx-auto" />
            <p className="text-xs font-bold">查無相符的問題記錄</p>
            <span className="text-[11px]">請嘗試更換搜尋關鍵字或分類狀態篩選條件。</span>
          </div>
        ) : (
          <div className="space-y-2.5">
            {pagedQuestions.visible.map((q) => {
              const catColor = CATEGORY_COLORS[q.category] || { hex: '#888', bg: 'bg-stone-100', text: 'text-stone-700', border: 'border-stone-200' };
              const isDelisted = q.status === 'delisted';
              const daysLeft = isDelisted ? getRetentionDaysLeft(q.delistedAt) : 30;
              const isSelected = selectedIds.has(q.id);

              return (
                <div
                  key={q.id}
                  className={`p-4 rounded-2xl bg-white border transition-all ${
                    isSelected
                      ? 'border-purple-400 bg-purple-50/20 shadow-xs ring-1 ring-purple-300'
                      : isDelisted
                      ? 'border-stone-200 bg-stone-50'
                      : 'border-stone-200 hover:border-stone-200 hover:shadow-2xs'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* 多選核取方塊 */}
                    <div className="pt-0.5 shrink-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(q.id)}
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-stone-300 cursor-pointer"
                        title="勾選此項目"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0 flex-1">
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* 精選推薦標記 */}
                          {q.isFeatured && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 shadow-2xs">
                              <Sparkles className="w-3 h-3 text-amber-600 fill-amber-500" />
                              精選作品
                            </span>
                          )}

                          {/* 狀態標籤 */}
                          {isDelisted ? (
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-stone-200 flex items-center gap-1">
                              <ShieldAlert className="w-3 h-3" />
                              違規已下架
                            </span>
                          ) : q.status === 'solved' ? (
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-stone-200">
                              已結案
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-stone-200">
                              招募中
                            </span>
                          )}

                        {/* 分類 */}
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${catColor.bg} ${catColor.text} border ${catColor.border}`}>
                          {q.category}
                        </span>

                        {/* 懸賞點數 */}
                        {!isNoPaymentMode && q.bounty > 0 ? (
                          <span className="text-[11px] font-semibold tabular-nums px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-stone-200">
                            NT$ {q.bounty.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
                            免費交流
                          </span>
                        )}

                        {/* 發布類型與對應回饋機制標籤 */}
                        {(() => {
                          const isSoftware =
                            q.postType === 'vibecoding_app' ||
                            q.category === '網站程式' ||
                            q.specialZone === 'vibecoding';
                          const isProposal = q.postType === 'innovation_proposal';
                          const isPain = q.postType === 'pain_point' || isPainPointQuestion(q);
                          const isL0 = isL0DiscussionQuestion(q);
                          const typeLabel = isSoftware
                            ? ' 軟體刊登'
                            : isProposal
                            ? ' 創新提案'
                            : isPain
                            ? ' 痛點'
                            : isL0
                            ? ' L0 討論'
                            : ' 問題類型';
                          const feedbackLabel = isSoftware || isProposal
                            ? ' 收藏 +  Like'
                            : isL0
                            ? ' 收藏 +  按讚'
                            : ' 收藏 +  +1 附議';
                          return (
                            <>
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-stone-200">
                                {typeLabel}
                              </span>
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-stone-50 text-stone-600 border border-stone-200">
                                回饋：{feedbackLabel}
                              </span>
                            </>
                          );
                        })()}

                        {/* 真實 / 模擬來源區隔標籤 */}
                        {isSimulatedQuestion(q) ? (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-stone-200">
                             模擬資料
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-stone-200">
                             真實貼文
                          </span>
                        )}

                        <span className="text-[11px] text-stone-400 tabular-nums">ID: {q.id}</span>
                      </div>

                      {/* 標題 */}
                      <h4 className="font-semibold text-sm text-stone-900 hover:text-purple-700 transition-colors line-clamp-1">
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
                          <span className="font-bold text-stone-700">
                            {isPlatformPublishedWork(q) ? '平台嚴選' : q.authorName}
                          </span>
                          {isPlatformPublishedWork(q) && (
                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-300">
                              平台刊登
                            </span>
                          )}
                        </div>
                        <span>•</span>
                        <span>{formatDateTime(q.createdAt)}</span>
                        <span>•</span>
                        <span>{q.answersCount || 0} 則討論/方案</span>
                        <span>•</span>
                        <span>
                          {q.postType === 'vibecoding_app' || q.category === '網站程式' || q.specialZone === 'vibecoding' || q.postType === 'innovation_proposal'
                            ? ` Like ${q.likes ?? 0}`
                            : isL0DiscussionQuestion(q)
                            ? ` 按讚 ${q.likes ?? 0}`
                            : ` +1 附議 ${(q.secondedCount ?? 0) + (q.sameQuestionCount ?? 0)}`}
                        </span>
                      </div>

                      {/* 違規下架事由與 7 日保留倒數 */}
                      {isDelisted && (
                        <div className="mt-2 p-2.5 rounded-xl bg-rose-50 border border-stone-200 text-xs text-rose-900 space-y-1.5">
                          <div className="flex items-center justify-between flex-wrap gap-1">
                            <div className="flex items-center gap-1.5 font-bold text-rose-950">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              <span>下架事由：{q.delistedReason || '違反平台內容審核守則'}</span>
                            </div>
                            <span className="text-[11px] tabular-nums font-semibold px-2 py-0.5 rounded-full bg-rose-200/80 text-rose-950 border border-stone-200">
                              ⏳ 暫存剩餘 {daysLeft} 天（7日後自動永久抹除）
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
                        onClick={() => {
                          try {
                            sessionStorage.setItem('ideax_from_admin_questions', 'true');
                          } catch {}
                          setSelectedQuestion(q);
                        }}
                        className="px-3 py-1.5 rounded-xl border border-stone-200 hover:border-stone-200 hover:bg-purple-50 text-stone-700 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        title="查閱問題詳細內容"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>檢視</span>
                      </button>

                      {/* 編輯提案/作品內容 (管理員直接編輯：僅限未轉移之官方/平台作品，一旦轉移至用戶名下，平台不再擁有編輯權限) */}
                      {!isDelisted && !q.isTransferred && !q.isOwnershipTransferred && !q.transferredToUserId && (
                        <button
                          type="button"
                          onClick={() => setEditingProposalQuestion(q)}
                          className="px-3 py-1.5 rounded-xl border border-stone-200 hover:border-purple-300 hover:bg-purple-50 text-purple-700 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                          title="管理員編輯此問題、痛點或提案作品"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>編輯</span>
                        </button>
                      )}

                      {/* 轉移所有權給用戶（若是平台刊登之作品或官方發布，且尚未轉移） */}
                      {(isPlatformPublishedWork(q) || q.publishIdentity === 'platform' || q.isOfficial || q.authorId === 'platform') && !q.isTransferred && !q.transferredToUserId && !isDelisted && (
                        <button
                          type="button"
                          onClick={() => setTransferringQuestion(q)}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                          title="將此平台刊登作品之所有權轉移給指定用戶，等同用戶自己發布的提案，可事後自由編輯"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>轉移所有權</span>
                        </button>
                      )}

                      {(q.isTransferred || q.isOwnershipTransferred || q.transferredToUserId) && (
                        <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1" title="此作品已轉移至會員名下，發布者為該會員，平台無編輯權限">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>已轉移用戶名下</span>
                        </span>
                      )}

                      {/* 創新提案 ⇄ 軟體作品 屬性互轉 (轉性按鍵) */}
                      {!isDelisted && (
                        <button
                          type="button"
                          onClick={() => setConvertingQuestion(q)}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 ${
                            q.postType === 'innovation_proposal' || q.specialZone === 'create_ideas'
                              ? 'bg-purple-600 hover:bg-purple-500 text-white border-purple-500 ring-2 ring-purple-200'
                              : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500 ring-2 ring-indigo-200'
                          }`}
                          title={
                            q.postType === 'innovation_proposal' || q.specialZone === 'create_ideas'
                              ? '【轉性按鍵】：將此創新提案轉為軟體作品 (VibeCoding展場)'
                              : '【轉性按鍵】：將此軟體作品轉為創新提案 (創點子專區)'
                          }
                        >
                          <ArrowLeftRight className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {q.postType === 'innovation_proposal' || q.specialZone === 'create_ideas'
                              ? '轉性 ➜ 軟體作品'
                              : '轉性 ➜ 創新提案'}
                          </span>
                        </button>
                      )}

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
              </div>
            );
            })}
        <ShowMoreButton remaining={pagedQuestions.remaining} onClick={pagedQuestions.showMore} />
          </div>
        )}
      </div>

      {/* 違規下架與用戶反饋 Modal */}
      {delistingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <ShieldAlert className="w-5 h-5" />
                <h4 className="font-semibold text-base text-stone-900">違規問題下架與處置反饋</h4>
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
              <span className="text-[11px] text-stone-400 font-bold block">處置對象問題：</span>
              <p className="font-semibold text-stone-900 line-clamp-1">{delistingQuestion.title}</p>
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
                <span className="text-[11px] text-rose-600 font-bold">*必填</span>
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
                <span className="text-[11px] text-stone-400">可選填具體處置建議</span>
              </label>
              <textarea
                rows={3}
                value={adminFeedback}
                onChange={(e) => setAdminFeedback(e.target.value)}
                placeholder="例如：提問內文中包含未授權之外部商業微信群與導流連結，違反平台社群守則第 3 條。請修改去除導流內容後聯繫官方申訴恢復上架。"
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl text-xs text-stone-800 focus:outline-none focus:border-rose-600 focus:bg-white resize-none"
              />
            </div>

            <div className="p-3 rounded-2xl bg-amber-50 border border-stone-200 text-[11px] text-amber-900">
              ℹ <strong>下架暫存保留政策：</strong>下架後將暫存 7 日於管理員問題或提案專區供追蹤申訴，滿 7 日將自動從資料庫永久抹除。
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
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
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
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <Trash2 className="w-5 h-5" />
                <h4 className="font-semibold text-base text-stone-900">永久刪除問題確認</h4>
              </div>
              <button
                type="button"
                onClick={() => setDeletingQuestion(null)}
                className="p-1 rounded-lg text-stone-400 hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50 border border-stone-200 text-xs text-rose-900 space-y-1.5">
              <p className="font-semibold line-clamp-2">{deletingQuestion.title}</p>
              <span className="text-[11px] text-rose-700 tabular-nums block">ID: {deletingQuestion.id} · 提問者: {deletingQuestion.authorName}</span>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
               <strong>警告：</strong>此操作將從平台與 <strong>Firebase Cloud Firestore 雲端資料庫</strong> 同步<strong>永久抹除</strong>此問題及其關聯提案，<strong>此操作不可逆</strong>，該問題將永不再出現。
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
                className="px-5 py-2 rounded-xl bg-rose-700 hover:bg-rose-600 text-white text-xs font-semibold transition-all cursor-pointer shadow-sm flex items-center gap-1.5 disabled:opacity-60"
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

      {/* 一鍵刪除全部模擬資料確認 Modal */}
      {confirmPurgeSimulatedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <Trash2 className="w-5 h-5" />
                <h4 className="font-semibold text-base text-stone-900">一鍵刪除全部模擬資料確認</h4>
              </div>
              <button
                type="button"
                onClick={() => setConfirmPurgeSimulatedModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50 border border-stone-200 text-xs text-amber-950 space-y-1.5">
              <p className="font-semibold">即將清除批次：{SIMULATED_BATCH_ID}</p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-900">
                <li>模擬帳號：{simulatedStats.simulatedUsersCount} 位虛擬角色帳號</li>
                <li>模擬貼文/方案：{simulatedStats.simulatedQuestionsCount} 篇模擬痛點與提案</li>
                <li>模擬討論留言：{simulatedStats.simulatedAnswersCount} 則模擬留言與詢問</li>
                <li>模擬交易紀錄：{simulatedStats.simulatedTransactionsCount} 筆模擬帳務</li>
              </ul>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              此操作會將所有標記為 <code className="tabular-nums bg-stone-100 px-1 py-0.5 rounded">isSimulated: true</code> 之模擬帳號、模擬貼文、模擬討論與模擬打賞自本機與 <strong>Firebase Cloud Firestore 資料庫</strong> 同步刪除，<strong>所有真實註冊會員與真實發布內容均完整保留不受影響</strong>。
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
              <button
                type="button"
                disabled={isSyncing}
                onClick={() => setConfirmPurgeSimulatedModal(false)}
                className="px-4 py-2 rounded-xl border border-stone-200 text-stone-700 text-xs font-bold hover:bg-stone-100 cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                disabled={isSyncing}
                onClick={async () => {
                  setIsSyncing(true);
                  try {
                    const res = await purgeAllSimulatedData();
                    setConfirmPurgeSimulatedModal(false);
                    setFeedbackToast({
                      text: `已成功自本機與雲端資料庫刪除全部模擬資料（貼文 ${res.purgedQuestions} 篇、討論 ${res.purgedAnswers} 則、模擬帳號 ${res.purgedUsers} 位）！`,
                      isError: false,
                    });
                  } catch (e: any) {
                    setFeedbackToast({
                      text: `清除失敗: ${e?.message || '未知錯誤'}`,
                      isError: true,
                    });
                  } finally {
                    setIsSyncing(false);
                    setTimeout(() => setFeedbackToast(null), 5000);
                  }
                }}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-all cursor-pointer shadow-sm flex items-center gap-1.5 disabled:opacity-60"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>雲端同步刪除中...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>確認一鍵刪除全部模擬資料</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ⚡ 網址智慧上架軟體網站彈窗 */}
      {isOnboardModalOpen && (
        <AdminQuickOnboardAppModal
          isOpen={isOnboardModalOpen}
          onClose={() => setIsOnboardModalOpen(false)}
          onSuccess={(q) => {
            setFeedbackToast({
              text: `已成功將軟體《${q.appName || q.title}》上架刊登至「軟體作品」專區！`,
              isError: false,
            });
            setTimeout(() => setFeedbackToast(null), 5000);
          }}
        />
      )}

      {/* 🔄 管理員轉移作品所有權至用戶名下彈窗 */}
      <AdminTransferWorkOwnershipModal
        isOpen={Boolean(transferringQuestion)}
        question={transferringQuestion}
        onClose={() => setTransferringQuestion(null)}
        onSuccess={(updatedQ) => {
          setFeedbackToast({
            text: `已成功將《${updatedQ.appName || updatedQ.title}》所有權移轉給【${updatedQ.authorName}】，用戶現在擁有完全編輯權限！`,
            isError: false,
          });
          setTimeout(() => setFeedbackToast(null), 5000);
          setTransferringQuestion(null);
        }}
      />

      {/* ✏️ 管理員編輯提案/作品內容彈窗 */}
      {editingProposalQuestion && (
        <UpdateProposalModal
          isOpen={Boolean(editingProposalQuestion)}
          question={editingProposalQuestion}
          onClose={() => setEditingProposalQuestion(null)}
          onSuccess={() => {
            setFeedbackToast({
              text: `已成功儲存並發布《${editingProposalQuestion.appName || editingProposalQuestion.title}》的內容更新！`,
              isError: false,
            });
            setTimeout(() => setFeedbackToast(null), 5000);
            setEditingProposalQuestion(null);
          }}
        />
      )}

      {/* 📌 多選批次操作懸浮列 (Sticky / Floating Batch Action Bar) */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-4xl bg-stone-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-stone-700/80 p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-md">
              {selectedIds.size}
            </div>
            <div>
              <div className="text-xs sm:text-sm font-black text-stone-100 flex items-center gap-1.5">
                <span>已選取 {selectedIds.size} 個項目</span>
              </div>
              <div className="text-[11px] text-stone-400">
                可一次執行批次精選、批次轉移所有權、批次下架或批次刪除
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="ml-2 text-xs text-stone-400 hover:text-white underline cursor-pointer"
            >
              取消選取
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* 批次精選下拉選單 */}
            <div className="relative">
              <button
                type="button"
                disabled={isBatchProcessing}
                onClick={() => setBatchFeaturedDropdownOpen(!batchFeaturedDropdownOpen)}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 fill-current" />
                <span>批次精選</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              {batchFeaturedDropdownOpen && (
                <div className="absolute bottom-full mb-2 right-0 bg-white text-stone-800 rounded-2xl shadow-2xl border border-stone-200 p-1.5 min-w-[150px] text-xs z-50 animate-in fade-in zoom-in-95 duration-150">
                  <button
                    type="button"
                    onClick={() => handleBatchFeatured(true)}
                    className="w-full text-left px-3 py-2 hover:bg-amber-50 hover:text-amber-950 rounded-xl font-bold flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span>設為精選作品 ⭐</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBatchFeatured(false)}
                    className="w-full text-left px-3 py-2 hover:bg-stone-100 rounded-xl text-stone-600 font-bold flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>取消精選推薦</span>
                  </button>
                </div>
              )}
            </div>

            {/* 批次轉性 (創新提案 ⇄ 軟體作品) */}
            <button
              type="button"
              disabled={isBatchProcessing}
              onClick={() => setIsBatchConvertModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              title="批次在創新提案與軟體作品之間互相轉換屬性"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>批次轉性</span>
            </button>

            {/* 批次轉移所有權 */}
            <button
              type="button"
              disabled={isBatchProcessing}
              onClick={handleOpenBatchTransfer}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              title="將選取的平台作品批次轉移所有權給指定用戶"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>批次轉移所有權</span>
            </button>

            {/* 批次違規下架 */}
            <button
              type="button"
              disabled={isBatchProcessing}
              onClick={() => setIsBatchDelistModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              title="將選取項目批次違規下架（暫存保留 7 日）"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>批次下架</span>
            </button>

            {/* 批次永久刪除 */}
            <button
              type="button"
              disabled={isBatchProcessing}
              onClick={() => setIsBatchDeleteModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-rose-700 text-rose-300 hover:text-white text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer border border-stone-700 hover:border-rose-600 shadow-xs disabled:opacity-50"
              title="徹底永久刪除選取項目（自資料庫抹除且無法復原）"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>批次刪除</span>
            </button>
          </div>
        </div>
      )}

      {/* ⚠️ 批次永久刪除確認彈窗 */}
      {isBatchDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2 text-rose-600 font-black">
                <Trash2 className="w-5 h-5 text-rose-600" />
                <h4 className="text-base text-stone-900">確認批次永久刪除？</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsBatchDeleteModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-2">
              <div className="flex items-center gap-2 font-black text-rose-950">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>此操作將永久抹除選取的 {selectedIds.size} 筆問題/作品！</span>
              </div>
              <p className="leading-relaxed text-[11px] text-rose-800">
                永久刪除後將同步自雲端 Firestore、提問端、管理端徹底抹除，關聯的未結案提問預扣點數將自動全額退還給提問者，此操作<strong>無法撤銷或復原</strong>。
              </p>
            </div>

            {/* 選取項目摘要清單 */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-stone-500">預計刪除的項目清單（共 {selectedQuestionsList.length} 筆）：</span>
              <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 bg-stone-50 rounded-xl border border-stone-200 text-xs">
                {selectedQuestionsList.map((q, idx) => (
                  <div key={q.id} className="flex items-center justify-between gap-2 p-1.5 bg-white rounded-lg border border-stone-100">
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-[10px] text-stone-400 font-mono">#{idx + 1}</span>
                      <span className="font-bold text-stone-800 truncate">{q.appName ? `【${q.appName}】${q.title}` : q.title}</span>
                    </div>
                    <span className="text-[10px] text-stone-400 shrink-0">{q.category}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                disabled={isBatchProcessing}
                onClick={() => setIsBatchDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-bold transition-all cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                disabled={isBatchProcessing}
                onClick={handleBatchDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-black transition-all cursor-pointer shadow-md flex items-center gap-1.5"
              >
                {isBatchProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>批次刪除中...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>確認永久刪除 ({selectedIds.size} 筆)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ⚠️ 批次違規下架彈窗 */}
      {isBatchDelistModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2 text-rose-600 font-black">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <h4 className="text-base text-stone-900">批次違規下架處置（共 {selectedIds.size} 筆）</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsBatchDelistModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
              <span className="font-black block"> 批次下架 7 日暫存說明：</span>
              <p className="text-[11px] leading-relaxed">
                被下架的 {selectedIds.size} 筆問題/作品將自前台隱藏並移入管理後台 <strong>7 日暫存期</strong>。期間內管理員可隨時「恢復上架」；滿 7 日後系統將自動永久抹除。
              </p>
            </div>

            {/* 違規原因快選 */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-800 flex items-center justify-between">
                <span>選擇主要違規事由：</span>
                <span className="text-[11px] text-rose-600 font-bold">*必填</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {PRESET_VIOLATIONS.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setBatchDelistReason(reason)}
                    className={`p-2 rounded-xl text-xs text-left transition-all cursor-pointer flex items-center gap-1.5 ${
                      batchDelistReason === reason
                        ? 'bg-rose-50 border-rose-300 text-rose-900 font-bold border'
                        : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100 border'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${batchDelistReason === reason ? 'bg-rose-500' : 'bg-stone-300'}`} />
                    <span className="truncate">{reason}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 管理員反饋意見 */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-800">
                管理員反饋與處置說明 (選填)：
              </label>
              <textarea
                value={batchDelistFeedback}
                onChange={(e) => setBatchDelistFeedback(e.target.value)}
                placeholder="請輸入給提問者/發布者的處置通知與指引說明..."
                rows={2}
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-none focus:border-purple-600"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                disabled={isBatchProcessing}
                onClick={() => setIsBatchDelistModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-bold transition-all cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                disabled={isBatchProcessing}
                onClick={handleBatchDelist}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-black transition-all cursor-pointer shadow-md flex items-center gap-1.5"
              >
                {isBatchProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>批次下架中...</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>確認批次下架 ({selectedIds.size} 筆)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔄 批次管理員轉移作品所有權至用戶名下彈窗 */}
      {isBatchTransferModalOpen && (
        <AdminTransferWorkOwnershipModal
          isOpen={isBatchTransferModalOpen}
          batchQuestions={selectedQuestionsList}
          onClose={() => setIsBatchTransferModalOpen(false)}
          onSuccessBatch={handleBatchTransferSuccess}
        />
      )}

      {/* 🔄 創新提案 ⇄ 軟體作品 屬性轉換彈窗 (單筆) */}
      {convertingQuestion && (
        <AdminConvertWorkTypeModal
          isOpen={Boolean(convertingQuestion)}
          question={convertingQuestion}
          onClose={() => setConvertingQuestion(null)}
          onSuccess={(updatedList) => {
            setConvertingQuestion(null);
            const updated = updatedList[0];
            if (updated) {
              showCenterToast(`已成功將「${updated.appName || updated.title}」轉換為${updated.postType === 'vibecoding_app' ? '「軟體作品」' : '「創新提案」'}`);
            }
          }}
        />
      )}

      {/* 🔄 創新提案 ⇄ 軟體作品 屬性轉換彈窗 (批次) */}
      {isBatchConvertModalOpen && (
        <AdminConvertWorkTypeModal
          isOpen={isBatchConvertModalOpen}
          batchQuestions={selectedQuestionsList}
          onClose={() => setIsBatchConvertModalOpen(false)}
          onSuccess={(updatedList) => {
            setIsBatchConvertModalOpen(false);
            setSelectedIds(new Set());
            const firstTarget = updatedList[0]?.postType === 'vibecoding_app' ? '「軟體作品」' : '「創新提案」';
            showCenterToast(`已成功批次將 ${updatedList.length} 筆項目轉換為${firstTarget}`);
          }}
        />
      )}
    </div>
  );
};

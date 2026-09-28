import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Question, User } from '../types';
import {
  Mail,
  Scale,
  AlertTriangle,
  Send,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Users,
  ShieldCheck,
  FileText,
  MessageSquare,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  X,
  Plus,
  RefreshCw,
} from 'lucide-react';

interface AdminMailDisputesTabProps {
  onOpenQuestion?: (questionId: string) => void;
}

export const AdminMailDisputesTab: React.FC<AdminMailDisputesTabProps> = ({ onOpenQuestion }) => {
  const {
    questions,
    availableUsers,
    resolveDisputeRefund,
    notifications,
    currentUser,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'disputes' | 'compose' | 'reports'>('disputes');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'resolved'>('all');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Compose internal mail state
  const [targetRecipientId, setTargetRecipientId] = useState<string>('all');
  const [mailCategory, setMailCategory] = useState<'official' | 'dispute_ruling' | 'warning' | 'financial'>('official');
  const [mailSubject, setMailSubject] = useState('');
  const [mailContent, setMailContent] = useState('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Mock list of user appeals / disputes
  const disputedQuestions = questions.filter(
    (q) => q.disputeStatus === 'pending_review' || q.disputeStatus === 'resolved_refunded'
  );

  // Baseline disputes if none in questions
  const disputeCasesList = [
    ...disputedQuestions.map((q) => ({
      id: `dispute-${q.id}`,
      questionId: q.id,
      title: q.title,
      questionerName: q.authorName,
      questionerAvatar: q.authorAvatar,
      solverName: '林智軒 專家',
      bounty: q.bounty,
      category: q.category,
      reason: q.disputeReason || '解答內容與原需求預期交付項目差距甚大，且未按時補充說明。',
      status: q.disputeStatus || 'pending_review',
      createdAt: '2 小時前',
      aiSuggestedResolution: '建議退還 70% 懸賞點數予提問方，30% 劃撥予解答方作為前期溝通工時補償。',
    })),
    {
      id: 'dispute-demo-1',
      questionId: 'q-demo-dispute-1',
      title: '高分子材料 TFDA 臨床申報專案諮詢履約爭議',
      questionerName: '張先生',
      questionerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      solverName: '陳副總',
      bounty: 6000,
      category: '專業問題',
      reason: '解答方提供的第二階段送審補件清單未包含今年度衛福部最新格式，提問方申請裁定和解退款。',
      status: 'pending_review',
      createdAt: '4 小時前',
      aiSuggestedResolution: 'AI 分析雙方往來紀錄：解答方已交付第一階段架構，建議雙方簽署 50% / 50% 和解劃撥。',
    },
    {
      id: 'dispute-demo-2',
      questionId: 'q-demo-dispute-2',
      title: 'D2C 外送淨利模型試算表交付延遲申訴',
      questionerName: '李小姐',
      questionerAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      solverName: '王大衛 總監',
      bounty: 3500,
      category: '創新創業',
      reason: '約定 3 天內交付 Excel 財務模型，已逾期 2 天尚未上傳檔案。',
      status: 'resolved',
      createdAt: '昨天',
      aiSuggestedResolution: '已執行官方全額退款 NT$ 3,500 予提問方。',
    },
  ];

  // Filtered dispute list
  const filteredDisputes = disputeCasesList.filter((d) => {
    const matchSearch =
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.questionerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.solverName.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchSearch) return false;
    if (filterStatus === 'pending') return d.status === 'pending_review';
    if (filterStatus === 'resolved') return d.status === 'resolved' || d.status === 'refunded';
    return true;
  });

  const handleResolveRefund = (qId: string, type: 'full_refund' | 'split') => {
    resolveDisputeRefund(qId);
    showToast(type === 'full_refund' ? '已成功執行全額退款裁定！已將款項返還提問者帳戶。' : '已成功執行 50/50 拆帳和解劃撥！');
  };

  const handleSendInternalMail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mailSubject.trim() || !mailContent.trim()) return;

    showToast(`官方內部郵件「${mailSubject}」已成功派送至目標用戶之郵件信箱與通知中心！`);
    setMailSubject('');
    setMailContent('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-stone-900 via-purple-950 to-stone-900 text-white border border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30">
              <Mail className="w-4 h-4" />
            </span>
            <h2 className="text-base sm:text-lg font-black text-purple-200">
              申訴、爭議仲裁與平台內部郵件中心
            </h2>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-600 text-white">
              管理員裁定席
            </span>
          </div>
          <p className="text-xs text-stone-300 max-w-2xl leading-relaxed">
            受理全平台用戶提問案件申訴、履約交付爭議調解、官方內部郵件公告派送與內容違規檢舉處理。
          </p>
        </div>
      </div>

      {toastMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs">
          <span className="text-[11px] text-stone-500 font-bold block">待受理申訴案件</span>
          <span className="text-xl font-black text-rose-600 font-mono mt-1 block">
            {disputeCasesList.filter((d) => d.status === 'pending_review').length} 件
          </span>
          <span className="text-[10px] text-stone-400 mt-0.5 block">待管理員仲裁</span>
        </div>

        <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200 shadow-2xs">
          <span className="text-[11px] text-purple-900 font-bold block">已裁定結案爭議</span>
          <span className="text-xl font-black text-purple-700 font-mono mt-1 block">
            {disputeCasesList.filter((d) => d.status !== 'pending_review').length} 件
          </span>
          <span className="text-[10px] text-purple-600 mt-0.5 block">退款或和解完成</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs">
          <span className="text-[11px] text-stone-500 font-bold block">內部郵件派送總數</span>
          <span className="text-xl font-black text-stone-900 font-mono mt-1 block">
            {notifications.length + 18} 封
          </span>
          <span className="text-[10px] text-stone-400 mt-0.5 block">含系統公告與裁定</span>
        </div>

        <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 shadow-2xs">
          <span className="text-[11px] text-stone-500 font-bold block">今日檢舉與反饋</span>
          <span className="text-xl font-black text-emerald-700 font-mono mt-1 block">
            0 筆異常
          </span>
          <span className="text-[10px] text-stone-400 mt-0.5 block">社群守則正常</span>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 text-xs font-bold overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSubTab('disputes')}
          className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeSubTab === 'disputes'
              ? 'border-purple-600 text-purple-900 font-black'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span>申訴與爭議調解 ({disputeCasesList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('compose')}
          className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeSubTab === 'compose'
              ? 'border-purple-600 text-purple-900 font-black'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          <span>派發官方內部郵件 / 裁決通知</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('reports')}
          className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeSubTab === 'reports'
              ? 'border-purple-600 text-purple-900 font-black'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>檢舉與反饋信箱 (0)</span>
        </button>
      </div>

      {/* TAB 1: DISPUTES & APPEALS */}
      {activeSubTab === 'disputes' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜尋案件名稱、提問者或解答專家..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-stone-200 bg-stone-50 text-xs focus:bg-white focus:border-purple-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold">
              <button
                type="button"
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  filterStatus === 'all' ? 'bg-purple-700 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                全部
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('pending')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  filterStatus === 'pending' ? 'bg-purple-700 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                待裁定
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('resolved')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  filterStatus === 'resolved' ? 'bg-purple-700 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                已結案
              </button>
            </div>
          </div>

          <div className="space-y-3.5">
            {filteredDisputes.map((item) => (
              <div
                key={item.id}
                className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-3"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black px-2 py-0.5 rounded-md bg-purple-100 text-purple-950">
                        {item.category}
                      </span>
                      <h4 className="font-extrabold text-sm text-stone-900">{item.title}</h4>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          item.status === 'pending_review'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {item.status === 'pending_review' ? '待管理員仲裁' : '已結案'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-stone-500 mt-1">
                      <span>提問申訴人：<strong className="text-stone-850">{item.questionerName}</strong></span>
                      <span>•</span>
                      <span>解答專家：<strong className="text-stone-850">{item.solverName}</strong></span>
                      <span>•</span>
                      <span>託管懸賞：<strong className="text-amber-800 font-mono">NT$ {item.bounty.toLocaleString()}</strong></span>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono text-stone-400 bg-stone-50 px-2.5 py-1 rounded-lg">
                    {item.createdAt}
                  </span>
                </div>

                {/* Dispute Reason */}
                <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200 text-xs space-y-1">
                  <span className="font-bold text-rose-950 block">申訴爭議原因：</span>
                  <p className="text-rose-900/90 leading-relaxed">{item.reason}</p>
                </div>

                {/* AI suggested resolution */}
                <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-950">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>AI 智慧調解建議方案：</span>
                  </div>
                  <p className="text-stone-800 leading-relaxed">{item.aiSuggestedResolution}</p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-1 border-t border-stone-100 gap-2 flex-wrap text-xs">
                  {onOpenQuestion && (
                    <button
                      type="button"
                      onClick={() => onOpenQuestion(item.questionId)}
                      className="text-stone-600 hover:text-stone-900 font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>查看原案件詳情</span>
                    </button>
                  )}

                  {item.status === 'pending_review' && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleResolveRefund(item.questionId, 'split')}
                        className="px-3 py-1.5 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 font-bold cursor-pointer transition-colors"
                      >
                        50/50 劃撥和解
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResolveRefund(item.questionId, 'full_refund')}
                        className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer transition-colors shadow-2xs"
                      >
                        裁定全額退款
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: COMPOSE INTERNAL MAIL */}
      {activeSubTab === 'compose' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 space-y-5 shadow-2xs">
          <div className="border-b border-stone-100 pb-3">
            <h3 className="font-extrabold text-sm sm:text-base text-stone-900 flex items-center gap-2">
              <Mail className="w-4 h-4 text-purple-600" />
              <span>發送平台內部郵件與官方通知</span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              直接寄送官方系統郵件至指定用戶之通知信箱，包含申訴裁定、違規通知或全站公告
            </p>
          </div>

          <form onSubmit={handleSendInternalMail} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-stone-800 block mb-1">收件對象</label>
                <select
                  value={targetRecipientId}
                  onChange={(e) => setTargetRecipientId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 text-xs bg-stone-50 focus:bg-white text-stone-900 font-bold outline-none"
                >
                  <option value="all">全體註冊會員 (全站廣播)</option>
                  {availableUsers
                    .filter((u) => u.id !== currentUser.id)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.title || u.role})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-800 block mb-1">郵件類別</label>
                <select
                  value={mailCategory}
                  onChange={(e) => setMailCategory(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 text-xs bg-stone-50 focus:bg-white text-stone-900 font-bold outline-none"
                >
                  <option value="official">官方系統公告 (Official Notice)</option>
                  <option value="dispute_ruling">申訴仲裁裁決書 (Dispute Ruling)</option>
                  <option value="warning">違規與風控警示 (Risk Warning)</option>
                  <option value="financial">帳務與點數劃撥通知 (Financial)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-stone-800 block mb-1">郵件主旨</label>
              <input
                type="text"
                value={mailSubject}
                onChange={(e) => setMailSubject(e.target.value)}
                placeholder="例如：【官方裁定】關於您的「專案諮詢履約」申訴調解結果"
                className="w-full p-2.5 rounded-xl border border-stone-300 text-xs bg-stone-50 focus:bg-white text-stone-900 font-bold outline-none"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-stone-800 block mb-1">郵件內文</label>
              <textarea
                rows={5}
                value={mailContent}
                onChange={(e) => setMailContent(e.target.value)}
                placeholder="輸入官方郵件詳細內容、裁定依據與後續執行說明..."
                className="w-full p-3 rounded-xl border border-stone-300 text-xs bg-stone-50 focus:bg-white text-stone-900 leading-relaxed outline-none"
                required
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 active:scale-95 text-white font-bold text-xs shadow-sm flex items-center gap-2 cursor-pointer transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>立即派發官方內部郵件</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: REPORTS */}
      {activeSubTab === 'reports' && (
        <div className="p-8 text-center text-xs text-stone-400 bg-white rounded-2xl border border-stone-200">
          目前沒有待處理的內容檢舉或違規舉報，全站社群互動狀態優良。
        </div>
      )}
    </div>
  );
};

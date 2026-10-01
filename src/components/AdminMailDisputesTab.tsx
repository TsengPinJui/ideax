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
  Coins,
} from 'lucide-react';

interface AdminMailDisputesTabProps {
  onOpenQuestion?: (questionId: string) => void;
}

export const AdminMailDisputesTab: React.FC<AdminMailDisputesTabProps> = ({ onOpenQuestion }) => {
  const {
    questions,
    availableUsers,
    resolveDisputeRefund,
    addNotification,
    notifications,
    currentUser,
    resolvedDisputeIds,
    markDisputeResolved,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'disputes' | 'reports'>('disputes');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'resolved'>('all');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // 爭議裁決確認視窗（顯示系統即將依照裁定結果自動發布的罐頭式官方文字）
  const [rulingModal, setRulingModal] = useState<{
    item: any;
    type: 'split' | 'full_refund';
  } | null>(null);

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
      status: resolvedDisputeIds.includes(`dispute-${q.id}`) || resolvedDisputeIds.includes(q.id) ? 'resolved' : (q.disputeStatus || 'pending_review'),
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
      status: resolvedDisputeIds.includes('dispute-demo-1') ? 'resolved' : 'pending_review',
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

  // 取得依照裁定結果自動生成的罐頭式官方文字
  const getCannedRulingText = (item: any, type: 'split' | 'full_refund') => {
    if (type === 'split') {
      return {
        subject: `【平台官方郵件・仲裁裁決結果通知】案件「${item.title}」已裁定 50/50 和解劃撥並結案`,
        body: `尊敬的用戶 您好：\n\n關於您參與之案件「${item.title}」的履約爭議申訴，經 IdeaX 平台官方仲裁委員會比對雙方歷程紀錄、溝通訊息與交付進展，判定雙方各自具備履約交流與階段付出實質，依平台爭議處理規範裁定為【50% / 50% 拆帳和解】。\n\n【劃撥與結案說明】：\n1. 本案件託管懸賞點數 NT$ ${item.bounty.toLocaleString()} 已依 50/50 比例劃撥。\n2. 50% 款項（NT$ ${(item.bounty * 0.5).toLocaleString()}）已撥入解答專家錢包。\n3. 50% 款項（NT$ ${(item.bounty * 0.5).toLocaleString()}）已退回提問者錢包可用餘額。\n4. 本爭議案件自即日起正式結案。\n\n感謝雙方對平台仲裁機制的信任與支持。\n\nIdeaX 平台官方治理中樞 敬上`,
      };
    }
    return {
      subject: `【平台官方郵件・仲裁裁決結果通知】案件「${item.title}」已裁定全額退款並結案`,
      body: `尊敬的用戶 您好：\n\n關於您參與之案件「${item.title}」的履約爭議申訴，經 IdeaX 平台官方仲裁委員會審核，判定解答方逾期交付或未達約定階段成果標準，提問方申訴成立，依平台爭議處理規範裁定為【全額退款予提問方】。\n\n【劃撥與結案說明】：\n1. 保留之全額懸賞點數 NT$ ${item.bounty.toLocaleString()} 已全數返還至提問者錢包可用餘額。\n2. 解答專家之信譽積分已記錄履約延誤標記。\n3. 本案件申訴程序自即日起正式全額退款並結案。\n\n感謝您對平台履約安全與交易治理的支持。\n\nIdeaX 平台官方治理中樞 敬上`,
    };
  };

  // 確定執行裁定並依照裁定結果自動發布罐頭式文字給相關用戶
  const handleConfirmRuling = () => {
    if (!rulingModal) return;
    const { item, type } = rulingModal;
    const canned = getCannedRulingText(item, type);

    // 1. 執行款項劃撥與退款 + 永久全站同步結案
    markDisputeResolved(item.id, item.questionId);

    // 2. 依照裁定結果自動發布罐頭式官方通知給相關用戶
    if (addNotification) {
      addNotification(canned.subject, canned.body, 'system');
    }

    // 3. Toast 反饋
    showToast(
      `裁定已生效！系統已依照裁定結果自動發布平台官方郵件與罐頭式文字給相關用戶（${item.questionerName}、${item.solverName}）。待處理案件數已同步歸零。`
    );

    setRulingModal(null);
  };

  // Pending count of dispute cases
  const pendingDisputesCount = disputeCasesList.filter((d) => d.status === 'pending_review').length;

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Top Header - Compact & Clean */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-stone-200 flex items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center shrink-0">
            <Mail className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black text-stone-900">
                申訴與郵件
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
                管理員專用
              </span>
            </div>
            <p className="text-[11px] text-stone-500">
              案件履約申訴受理、爭議仲裁劃撥、裁定自動派發平台官方郵件與罐頭式通知
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-bold shrink-0">
          <span className="text-[11px] text-stone-400">待裁定案件：</span>
          <span className="font-mono font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
            {pendingDisputesCount} 件
          </span>
        </div>
      </div>

      {toastMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Sub Tabs - Clean & Simple */}
      <div className="flex items-center gap-1 border-b border-stone-200 text-xs font-bold overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setActiveSubTab('disputes')}
          className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeSubTab === 'disputes'
              ? 'bg-stone-900 text-white font-black'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span>申訴調解 ({pendingDisputesCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('reports')}
          className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeSubTab === 'reports'
              ? 'bg-stone-900 text-white font-black'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>檢舉反饋 (0)</span>
        </button>
      </div>

      {/* TAB 1: DISPUTES & APPEALS */}
      {activeSubTab === 'disputes' && (
        <div className="space-y-3">
          {/* 自動派發罐頭文字說明橫幅 */}
          <div className="p-3 rounded-xl bg-gradient-to-r from-purple-50 via-stone-50 to-purple-50/40 border border-purple-200 text-xs flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-extrabold text-stone-900 block mb-0.5">
                平台官方郵件自動發布規範
              </span>
              <p className="text-[11px] text-stone-600 leading-relaxed">
                管理員執行案件仲裁（50/50 和解劃撥或全額退款）後，系統將<strong>依照裁定結果自動發布罐頭式文字給相關用戶（提問方與解答方）之信箱與通知中心</strong>，保障當事人即時獲悉裁決與點數撥付明細。
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜尋案件、提問者或專家..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-stone-200 bg-white text-xs focus:border-stone-400 outline-none"
              />
            </div>

            <div className="flex items-center gap-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setFilterStatus('all')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  filterStatus === 'all' ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                全部 ({disputeCasesList.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('pending')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  filterStatus === 'pending' ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                待裁定 ({disputeCasesList.filter((d) => d.status === 'pending_review').length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('resolved')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  filterStatus === 'resolved' ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                已結案
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {filteredDisputes.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-2"
              >
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-stone-100 text-stone-700">
                        {item.category}
                      </span>
                      <h4 className="font-black text-xs sm:text-sm text-stone-900">{item.title}</h4>
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.2 rounded-full ${
                          item.status === 'pending_review'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {item.status === 'pending_review' ? '待裁定' : '已結案'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-stone-500 mt-1">
                      <span>提問方：<strong>{item.questionerName}</strong></span>
                      <span>·</span>
                      <span>解答方：<strong>{item.solverName}</strong></span>
                      <span>·</span>
                      <span>金額：<strong className="text-amber-800 font-mono">NT$ {item.bounty.toLocaleString()}</strong></span>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono text-stone-400">
                    {item.createdAt}
                  </span>
                </div>

                {/* Dispute Reason & Suggestion - Compact */}
                <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200 text-xs space-y-1">
                  <p className="text-stone-700 leading-snug"><span className="font-bold text-stone-900">原因：</span>{item.reason}</p>
                  <p className="text-stone-600 text-[11px] leading-snug"><span className="font-bold text-amber-900">AI 建議：</span>{item.aiSuggestedResolution}</p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-1 border-t border-stone-100 gap-2 flex-wrap text-xs">
                  {onOpenQuestion ? (
                    <button
                      type="button"
                      onClick={() => onOpenQuestion(item.questionId)}
                      className="text-stone-500 hover:text-stone-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>案件詳情</span>
                    </button>
                  ) : <div />}

                  {item.status === 'pending_review' ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setRulingModal({ item, type: 'split' })}
                        className="px-2.5 py-1 rounded-lg border border-stone-300 hover:bg-stone-50 text-stone-700 font-bold text-xs cursor-pointer transition-all"
                        title="裁定雙方和解，系統自動派發官方郵件"
                      >
                        50/50 和解劃撥
                      </button>
                      <button
                        type="button"
                        onClick={() => setRulingModal({ item, type: 'full_refund' })}
                        className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer shadow-2xs transition-all"
                        title="裁定全額退款，系統自動派發官方郵件"
                      >
                        全額退款
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>已完成裁定並自動派發平台官方郵件</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: REPORTS */}
      {activeSubTab === 'reports' && (
        <div className="p-8 text-center text-xs text-stone-400 bg-white rounded-2xl border border-stone-200">
          目前沒有待處理的內容檢舉或違規舉報，全站社群互動狀態優良。
        </div>
      )}

      {/* 裁定確認彈窗：顯示依照裁定結果系統將自動發布的罐頭式官方文字 */}
      {rulingModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-stone-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Scale className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-stone-900">
                    執行案件仲裁裁定
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    裁定將依照結果自動發布平台官方郵件罐頭式文字至雙方通知中心
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRulingModal(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 案件摘要 */}
            <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-stone-900">{rulingModal.item.title}</span>
                <span className="font-mono font-bold text-amber-800">
                  NT$ {rulingModal.item.bounty.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-stone-500">
                <span>提問方：<strong>{rulingModal.item.questionerName}</strong></span>
                <span>解答方：<strong>{rulingModal.item.solverName}</strong></span>
                <span>
                  裁決處分：
                  <strong className={rulingModal.type === 'split' ? 'text-blue-700' : 'text-rose-700'}>
                    {rulingModal.type === 'split' ? '50/50 拆帳和解劃撥' : '全額退款予提問方'}
                  </strong>
                </span>
              </div>
            </div>

            {/* 即將自動發布的罐頭式官方文字預覽 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-purple-700" />
                  <span>系統將依照裁定結果自動發布之罐頭式官方文字：</span>
                </label>
                <span className="text-[10px] font-bold text-stone-400">自動廣播至提問方與解答方</span>
              </div>

              <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-200 space-y-2 text-xs">
                <div className="pb-2 border-b border-purple-200/60 font-black text-purple-950 flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-purple-200/80 text-[10px] text-purple-900 font-mono">平台官方郵件</span>
                  <span>{getCannedRulingText(rulingModal.item, rulingModal.type).subject}</span>
                </div>
                <div className="text-[11px] text-stone-700 whitespace-pre-line leading-relaxed font-sans bg-white p-3 rounded-lg border border-purple-100 max-h-48 overflow-y-auto">
                  {getCannedRulingText(rulingModal.item, rulingModal.type).body}
                </div>
              </div>
            </div>

            <p className="text-[11px] text-stone-500 leading-normal">
              ⚠️ 點擊確認後，款項將依照裁定自動自託管帳戶劃撥/退還，系統會自動發布上述罐頭式官方文字給相關用戶，並將本案件標記為已結案。
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setRulingModal(null)}
                className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-bold cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmRuling}
                className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 active:scale-95 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>確認裁定並自動派發官方郵件</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

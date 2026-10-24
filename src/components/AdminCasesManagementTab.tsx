import React, { useState } from 'react';
import { usePagedList, ShowMoreButton } from './ShowMoreList';
import { useApp } from '../context/AppContext';
import { Question, Answer, ChatConversation } from '../types';
import { ContractPreviewModal } from './ContractPreviewModal';
import { 
  ContractData, 
  buildContractFromProposalItem, 
  downloadContractFile 
} from '../utils/contractGenerator';
import {
  Briefcase,
  Search,
  Filter,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  User,
  X,
  Send,
  Eye,
  Paperclip,
  FileText,
  Download,
} from 'lucide-react';

export const AdminCasesManagementTab: React.FC<{
  onOpenQuestion?: (questionId: string) => void;
}> = ({ onOpenQuestion }) => {
  const { questions, answers, conversations } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'solved' | 'disputed'>('all');

  // 對話紀錄檢視彈窗狀態
  const [activeDialogueCase, setActiveDialogueCase] = useState<{
    caseTitle: string;
    questionId?: string;
    questionerName: string;
    solverName: string;
    conversation?: ChatConversation;
  } | null>(null);

  const [previewContract, setPreviewContract] = useState<ContractData | null>(null);

  // 整理案件清單
  const casesList = questions.map((q) => {
    // 只算解決方案（不含討論留言）；「採納專家」必須是真的被採納的那一份，不能拿第一則留言充數
    const qAnswers = answers.filter((a) => a.questionId === q.id && a.type !== 'discussion');
    const acceptedAnswer = qAnswers.find((a) => a.isAccepted);
    const matchingConv = conversations.find(
      (c) =>
        c.relatedQuestionId === q.id ||
        (acceptedAnswer && c.participantIds.includes(q.authorId) && c.participantIds.includes(acceptedAnswer.solverId))
    );

    let progressStatus: 'open' | 'in_progress' | 'solved' | 'disputed' = 'open';
    if (q.disputeStatus === 'pending_review') {
      progressStatus = 'disputed';
    } else if (q.status === 'solved') {
      progressStatus = 'solved';
    } else if (acceptedAnswer) {
      progressStatus = 'in_progress';
    }

    return {
      id: q.id,
      title: q.title,
      description: q.description,
      bounty: q.bounty,
      category: q.category,
      questionerId: q.authorId,
      questionerName: q.authorName,
      questionerAvatar: q.authorAvatar,
      solverName: acceptedAnswer ? acceptedAnswer.solverName : '尚無專家被採納',
      solverAvatar: acceptedAnswer?.solverAvatar,
      solutionsCount: qAnswers.length,
      status: progressStatus,
      statusLabel:
        progressStatus === 'disputed'
          ? '爭議申訴審查中'
          : progressStatus === 'solved'
          ? '已完成結案'
          : progressStatus === 'in_progress'
          ? '進行中交付'
          : '公開招募解答中',
      statusBadge:
        progressStatus === 'disputed'
          ? 'bg-rose-100 text-rose-900 border-stone-200'
          : progressStatus === 'solved'
          ? 'bg-emerald-100 text-emerald-900 border-stone-200'
          : progressStatus === 'in_progress'
          ? 'bg-amber-100 text-amber-950 border-stone-200'
          : 'bg-blue-100 text-blue-900 border-stone-200',
      createdAt: q.createdAt,
      deadline: q.deadline,
      acceptedAnswer,
      conversation: matchingConv,
    };
  });

  // 案件統計數量
  const openCasesCount = casesList.filter((c) => c.status === 'open').length;
  const inProgressCasesCount = casesList.filter((c) => c.status === 'in_progress').length;
  const solvedCasesCount = casesList.filter((c) => c.status === 'solved').length;
  const disputedCasesCount = casesList.filter((c) => c.status === 'disputed').length;

  const filteredCases = casesList
    .filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchQ = item.questionerName.toLowerCase().includes(q);
        const matchS = item.solverName.toLowerCase().includes(q);
        const matchDesc = item.description.toLowerCase().includes(q);
        return matchTitle || matchQ || matchS || matchDesc;
      }
      return true;
    })
    .sort((a, b) => {
      const timeB = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeA = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return (Number.isFinite(timeA) ? timeA : 0) - (Number.isFinite(timeB) ? timeB : 0);
    });
  const pagedCases = usePagedList(filteredCases, 20);

  const handleOpenDialogue = (item: (typeof casesList)[0]) => {
    setActiveDialogueCase({
      caseTitle: item.title,
      questionId: item.id,
      questionerName: item.questionerName,
      solverName: item.solverName,
      conversation: item.conversation,
    });
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* 標題與說明 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-3.5">
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-stone-900 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-purple-600" />
            <span>案件管理</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-900">
              全站共 {questions.length} 筆案件
            </span>
          </h3>
          <p className="text-xs text-stone-500 mt-1">
            查閱全站案件詳細狀況、提問者與接案專家履約進度，並可查閱雙方在私聊中的對話紀錄與自訂方案。
          </p>
        </div>
      </div>

      {/* 案件狀態多格面板 (手機 2x2 / 電腦 4 欄一覽) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-center">
        <div
          onClick={() => setStatusFilter(statusFilter === 'open' ? 'all' : 'open')}
          className={`p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'open'
              ? 'bg-stone-50 border-blue-400 ring-2 ring-blue-300 shadow-xs'
              : 'bg-stone-50 border-stone-200 hover:bg-stone-50'
          }`}
        >
          <span className="text-[11px] text-blue-800 font-bold block flex items-center justify-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>招募中案件</span>
          </span>
          <span className="text-xl sm:text-2xl font-semibold text-blue-900 tabular-nums mt-1 block">
            {openCasesCount} 筆
          </span>
          <span className="text-[11px] text-blue-700/80 mt-0.5 block truncate">等待專家提案</span>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === 'in_progress' ? 'all' : 'in_progress')}
          className={`p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'in_progress'
              ? 'bg-stone-50 border-amber-400 ring-2 ring-amber-300 shadow-xs'
              : 'bg-stone-50 border-stone-200 hover:bg-stone-50'
          }`}
        >
          <span className="text-[11px] text-amber-800 font-bold block flex items-center justify-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>進行中交付</span>
          </span>
          <span className="text-xl sm:text-2xl font-semibold text-amber-900 tabular-nums mt-1 block">
            {inProgressCasesCount} 筆
          </span>
          <span className="text-[11px] text-amber-700/80 mt-0.5 block truncate">專家履約執行中</span>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === 'solved' ? 'all' : 'solved')}
          className={`p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'solved'
              ? 'bg-stone-50 border-emerald-400 ring-2 ring-emerald-300 shadow-xs'
              : 'bg-stone-50 border-stone-200 hover:bg-stone-50'
          }`}
        >
          <span className="text-[11px] text-emerald-800 font-bold block flex items-center justify-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>已完成結案</span>
          </span>
          <span className="text-xl sm:text-2xl font-semibold text-emerald-900 tabular-nums mt-1 block">
            {solvedCasesCount} 筆
          </span>
          <span className="text-[11px] text-emerald-700/80 mt-0.5 block truncate">驗收採納撥款</span>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === 'disputed' ? 'all' : 'disputed')}
          className={`p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'disputed'
              ? 'bg-stone-50 border-rose-400 ring-2 ring-rose-300 shadow-xs'
              : 'bg-stone-50 border-stone-200 hover:bg-stone-50'
          }`}
        >
          <span className="text-[11px] text-rose-800 font-bold block flex items-center justify-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>爭議申訴件</span>
          </span>
          <span className="text-xl sm:text-2xl font-semibold text-rose-900 tabular-nums mt-1 block">
            {disputedCasesCount} 筆
          </span>
          <span className="text-[11px] text-rose-700/80 mt-0.5 block truncate">待管理員介入</span>
        </div>
      </div>

      {/* 篩選與搜尋列 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-2xl border border-stone-200 overflow-x-auto">
          {[
            { id: 'all', label: '全部案件' },
            { id: 'open', label: '招募中' },
            { id: 'in_progress', label: '進行中交付' },
            { id: 'solved', label: '已完成結案' },
            { id: 'disputed', label: '爭議申訴' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-purple-700 text-white shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative sm:w-64">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="搜尋案件名稱、提問者或專家..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:border-purple-500 outline-none"
          />
        </div>
      </div>

      {/* 案件卡片列表 */}
      <div className="space-y-3.5">
        {filteredCases.length === 0 ? (
          <div className="p-10 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200 space-y-2">
            <Briefcase className="w-8 h-8 text-stone-300 mx-auto" />
            <p className="text-xs font-bold text-stone-600">無相符案件紀錄</p>
          </div>
        ) : (
          pagedCases.visible.map((item) => (
            <div
              key={item.id}
              className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 hover:border-stone-200 shadow-2xs transition-all space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                    {item.category}
                  </span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${item.statusBadge}`}>
                    {item.statusLabel}
                  </span>
                  <span className="text-xs tabular-nums text-stone-400">ID: {item.id}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-400">提案懸賞：</span>
                  <span className="text-base font-semibold text-amber-950 tabular-nums">
                    NT$ {item.bounty.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* 案件名稱與摘要 */}
              <div>
                <h4 className="font-semibold text-sm text-stone-900 hover:text-purple-700 transition-colors">
                  {item.title}
                </h4>
                <p className="text-xs text-stone-600 mt-1 line-clamp-2 leading-relaxed">
                  {item.description}
                </p>
              </div>

              {/* 雙方資訊與動作列 */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-stone-100 text-xs">
                <div className="flex items-center gap-4 flex-wrap text-stone-600">
                  <div className="flex items-center gap-1.5">
                    <img
                      src={item.questionerAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                      alt={item.questionerName}
                      className="w-5 h-5 rounded-full object-cover ring-1 ring-stone-200"
                    />
                    <span>提問者：<strong className="text-stone-900">{item.questionerName}</strong></span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {item.solverAvatar && (
                      <img
                        src={item.solverAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                        alt={item.solverName}
                        className="w-5 h-5 rounded-full object-cover ring-1 ring-stone-200"
                      />
                    )}
                    <span>採納專家：<strong className="text-stone-900">{item.solverName}</strong></span>
                  </div>

                  <span className="text-stone-400">
                    累計方案：<strong>{item.solutionsCount}</strong> 筆
                  </span>
                </div>

                {/* 動作按鈕 */}
                <div className="flex items-center gap-2">
                  {/* 下載契約檔案按鈕 (若已採納或進行中/結案) */}
                  {(item.status === 'in_progress' || item.status === 'solved' || item.acceptedAnswer) && (
                    <button
                      type="button"
                      onClick={() => {
                        const cData = buildContractFromProposalItem(
                          {
                            id: item.id,
                            title: item.title,
                            description: item.description,
                            questionTitle: item.title,
                            amount: item.bounty,
                            role: 'buyer',
                            partnerId: item.acceptedAnswer?.solverId || 'solver',
                            partnerName: item.solverName,
                            partnerTitle: '解答專家',
                          },
                          { id: item.questionerId, name: item.questionerName }
                        );
                        setPreviewContract(cData);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-950 border border-stone-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="檢視與下載此案件之商業契約檔案"
                    >
                      <FileText className="w-3.5 h-3.5 text-amber-700" />
                      <span>合約檔案</span>
                    </button>
                  )}

                  {/* 查閱對話紀錄按鈕 */}
                  <button
                    type="button"
                    onClick={() => handleOpenDialogue(item)}
                    className="px-3.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-stone-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="查閱雙方私聊訊息與對話紀錄"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-purple-700" />
                    <span>查閱對話紀錄</span>
                  </button>

                  {onOpenQuestion && (
                    <button
                      type="button"
                      onClick={() => onOpenQuestion(item.id)}
                      className="px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      title="前往問題詳情頁"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>查看題目</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <ShowMoreButton remaining={pagedCases.remaining} onClick={pagedCases.showMore} />
      </div>

      {/* 查閱對話紀錄彈窗 */}
      {activeDialogueCase && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-stone-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2 text-purple-700">
                <MessageSquare className="w-5 h-5" />
                <h4 className="font-semibold text-base text-stone-900 truncate max-w-xs">
                  案件對話審計紀錄
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setActiveDialogueCase(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs space-y-1">
              <span className="font-bold text-stone-800 block truncate">
                案件名稱：{activeDialogueCase.caseTitle}
              </span>
              <div className="flex items-center justify-between text-[11px] text-stone-500">
                <span>提問委託人：<strong>{activeDialogueCase.questionerName}</strong></span>
                <span>接案專家：<strong>{activeDialogueCase.solverName}</strong></span>
              </div>
            </div>

            {/* 對話訊息歷史 */}
            <div className="flex-1 overflow-y-auto space-y-3 p-3 bg-stone-50/60 rounded-2xl border border-stone-200 min-h-[240px]">
              {activeDialogueCase.conversation && activeDialogueCase.conversation.messages.length > 0 ? (
                activeDialogueCase.conversation.messages.map((m) => (
                  <div key={m.id} className="p-3 rounded-xl bg-white border border-stone-200 space-y-1 text-xs shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-stone-900 flex items-center gap-1.5">
                        <img src={m.senderAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'} alt="" className="w-4 h-4 rounded-full" />
                        <span>{m.senderName}</span>
                      </span>
                      <span className="text-[11px] text-stone-400 tabular-nums">{m.createdAt.split('T')[0]}</span>
                    </div>

                    <p className="text-stone-700 text-xs leading-relaxed pt-1">
                      {m.text}
                    </p>

                    {m.offer && (
                      <div className="mt-2 p-2.5 rounded-lg bg-amber-50 border border-stone-200 space-y-1">
                        <span className="text-[11px] font-semibold text-amber-950 block">
                          [自訂專屬報價單] {m.offer.title} - NT$ {m.offer.price.toLocaleString()}
                        </span>
                        <p className="text-[11px] text-amber-900">{m.offer.description}</p>
                        <span className="text-[11px] text-stone-500 block">狀態：{m.offer.status}</span>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-xs text-stone-400">
                  此案件雙方目前尚無私聊對話紀錄，或尚未開啟一對一私密溝通室。
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setActiveDialogueCase(null)}
                className="px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 cursor-pointer"
              >
                關閉對話紀錄
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 商業契約與和解協議書檢視/下載 Modal */}
      {previewContract && (
        <ContractPreviewModal
          contract={previewContract}
          onClose={() => setPreviewContract(null)}
        />
      )}
    </div>
  );
};

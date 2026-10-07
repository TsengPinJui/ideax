import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Trash2,
  Edit3,
  Clock,
  Sparkles,
  Layers,
  ArrowRight,
  Plus,
  Coins,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StarSeasonProposal, STAR_SEASON_TRACKS } from '../../types/competition';
import { ProposalDraft, getProposalDrafts, deleteProposalDraft } from '../../services/draftService';

interface MyProposalsAndDraftsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEditDraft: (draftId: string) => void;
  onSelectProposalForDetail: (proposal: StarSeasonProposal) => void;
  onCreateNewProposal: () => void;
  proposals: StarSeasonProposal[];
}

export const MyProposalsAndDraftsModal: React.FC<MyProposalsAndDraftsModalProps> = ({
  isOpen,
  onClose,
  onEditDraft,
  onSelectProposalForDetail,
  onCreateNewProposal,
  proposals,
}) => {
  const { currentUser, addNotification } = useApp();
  const [activeTab, setActiveTab] = useState<'drafts' | 'published'>('drafts');
  const [drafts, setDrafts] = useState<ProposalDraft[]>([]);

  const loadDrafts = () => {
    if (currentUser) {
      setDrafts(getProposalDrafts(currentUser.id));
    } else {
      setDrafts(getProposalDrafts());
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadDrafts();
    }
  }, [isOpen, currentUser]);

  useEffect(() => {
    const handleDraftsUpdated = () => {
      loadDrafts();
    };
    window.addEventListener('ideax_drafts_updated', handleDraftsUpdated);
    return () => {
      window.removeEventListener('ideax_drafts_updated', handleDraftsUpdated);
    };
  }, [currentUser]);

  if (!isOpen) return null;

  // 使用者已發布的提案
  const myPublishedProposals = proposals.filter((p) => {
    if (!currentUser) return false;
    return (
      p.authorId === currentUser.id ||
      p.authorName === currentUser.name ||
      Boolean(currentUser.email && (p as any).authorEmail === currentUser.email)
    );
  });

  const handleDeleteDraft = (draftId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('確定要刪除此提案草稿嗎？此操作無法復原。')) {
      deleteProposalDraft(draftId);
      loadDrafts();
      addNotification({
        title: '草稿箱',
        message: '已成功刪除該筆提案草稿',
        type: 'system',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white border border-amber-300 rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center shadow-2xs shrink-0">
              <FolderOpen className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-stone-900 flex items-center gap-2">
                <span>個人提案與草稿管理</span>
              </h3>
              <p className="text-xs text-stone-500">隨時查看、編輯已暫存的草稿或追蹤已發布提案進度</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab 切換 Pills */}
        <div className="p-3 sm:px-6 bg-stone-100/70 border-b border-stone-200/80 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 p-1 bg-white rounded-2xl border border-stone-200 text-xs font-bold shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveTab('drafts')}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'drafts'
                  ? 'bg-amber-400 text-stone-950 font-black shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>提案草稿箱</span>
              <span className="text-[10px] font-mono font-black px-1.5 py-0.2 rounded-full bg-stone-900 text-white">
                {drafts.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('published')}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'published'
                  ? 'bg-amber-400 text-stone-950 font-black shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-700" />
              <span>已發布提案</span>
              <span className="text-[10px] font-mono font-black px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900">
                {myPublishedProposals.length}
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              onCreateNewProposal();
            }}
            className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-98"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新增提案</span>
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3">
          {/* Tab 1: 草稿箱列表 */}
          {activeTab === 'drafts' && (
            <>
              {drafts.length === 0 ? (
                <div className="text-center py-12 bg-stone-50 rounded-3xl border border-dashed border-stone-200 space-y-3">
                  <FileText className="w-10 h-10 text-stone-300 mx-auto" />
                  <div>
                    <h4 className="font-bold text-sm text-stone-800">目前沒有暫存的提案草稿</h4>
                    <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                      在填寫「我想提案!」時點擊「存為草稿」，即可隨時回到此處繼續編輯並送審！
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onCreateNewProposal();
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>立即開始寫提案</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {drafts.map((draft) => {
                    const trackInfo = STAR_SEASON_TRACKS[draft.track as keyof typeof STAR_SEASON_TRACKS] || Object.values(STAR_SEASON_TRACKS).find((t: any) => t.id === draft.track);
                    return (
                      <div
                        key={draft.id}
                        className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200/90 shadow-2xs hover:border-amber-400 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                      >
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-100 text-amber-900">
                              草稿
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700">
                              {draft.stage === 'solution' ? '創新解方提案' : '痛點徵件'}
                            </span>
                            {trackInfo && (
                              <span className="text-[10px] font-medium text-stone-500">
                                · {trackInfo.name}
                              </span>
                            )}
                            <span className="text-[10px] text-stone-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              最後儲存：{new Date(draft.updatedAt).toLocaleString()}
                            </span>
                          </div>

                          <h4 className="text-sm sm:text-base font-black text-stone-900 truncate">
                            {draft.title || '(尚未命名之草稿)'}
                          </h4>

                          <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                            {draft.summary || draft.description || '尚未填寫提案摘要...'}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onEditDraft(draft.id);
                            }}
                            className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-black transition-all cursor-pointer shadow-2xs flex items-center gap-1.5 active:scale-98"
                            title="繼續編輯此草稿"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>繼續編輯</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleDeleteDraft(draft.id, e)}
                            className="p-2 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="刪除此草稿"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Tab 2: 已發布提案 */}
          {activeTab === 'published' && (
            <>
              {myPublishedProposals.length === 0 ? (
                <div className="text-center py-12 bg-stone-50 rounded-3xl border border-dashed border-stone-200 space-y-3">
                  <Sparkles className="w-10 h-10 text-stone-300 mx-auto" />
                  <div>
                    <h4 className="font-bold text-sm text-stone-800">目前尚無已正式發布的提案</h4>
                    <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                      完成草稿撰寫並確認提交初審後，您的提案將在此即時顯示審查與募資狀態！
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {myPublishedProposals.map((p) => (
                    <div
                      key={p.id}
                      className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200/90 shadow-2xs hover:border-amber-400 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                              p.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-900'
                                : p.status === 'rejected'
                                ? 'bg-rose-100 text-rose-900'
                                : 'bg-amber-100 text-amber-900'
                            }`}
                          >
                            {p.status === 'approved'
                              ? '審核通過・募資中'
                              : p.status === 'rejected'
                              ? '未通過初審'
                              : '初審進行中'}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700">
                            {p.stage === 'solution' ? '創新提案' : '痛點需求'}
                          </span>
                          <span className="text-[10px] text-stone-400">
                            {new Date(p.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <h4 className="text-sm sm:text-base font-black text-stone-900 truncate">
                          {p.title}
                        </h4>

                        <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                          {p.summary}
                        </p>

                        <div className="flex items-center gap-3 text-xs text-stone-500 pt-1 font-bold">
                          <span className="flex items-center gap-1 text-amber-700 font-mono">
                            <Coins className="w-3.5 h-3.5 text-amber-500" />
                            {(p.supportPoints || 0).toLocaleString()} 創星幣
                          </span>
                          <span>·</span>
                          <span>獲支持 {p.supporterCount || 0} 次</span>
                          <span>·</span>
                          <span>按讚 {p.likeCount || 0}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onSelectProposalForDetail(p);
                          }}
                          className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1.5 active:scale-98"
                        >
                          <span>查看詳情</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

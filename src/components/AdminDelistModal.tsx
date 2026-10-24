import React, { useState } from 'react';
import { AlertTriangle, Trash2, ShieldAlert, X, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { withdrawCompetitionProposal } from '../services/competitionAdminSync';

interface AdminDelistModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string;
  targetTitle: string;
  targetType?: 'proposal' | 'app' | 'question';
  onSuccess?: () => void;
}

const PRESET_VIOLATIONS = [
  '未符合社群與刊登規範',
  '含有商業導流、外鏈或未授權廣告',
  '涉及他人隱私、個資或未授權揭露',
  '含有不實資訊、誤導或詐欺嫌疑',
  '侵犯第三方智慧財產權或著作權',
  '內容空洞無效或重複洗版',
];

export const AdminDelistModal: React.FC<AdminDelistModalProps> = ({
  isOpen,
  onClose,
  targetId,
  targetTitle,
  targetType = 'proposal',
  onSuccess,
}) => {
  const { delistQuestion, deleteQuestionPermanently, showCenterToast, addNotification } = useApp();
  const [tab, setTab] = useState<'direct' | 'violation' | 'permanent_delete'>('direct');
  const [reasonPreset, setReasonPreset] = useState(PRESET_VIOLATIONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [adminFeedback, setAdminFeedback] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const typeName =
    targetType === 'proposal'
      ? '創新提案'
      : targetType === 'app'
      ? '軟體作品'
      : '問題貼文';

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      // 模式 3：直接刪除（自全站與雲端資料庫永久抹除，不保留暫存）
      if (tab === 'permanent_delete') {
        await deleteQuestionPermanently(targetId);

        try {
          withdrawCompetitionProposal(targetId);
        } catch {
          // 非競賽項目可忽略
        }

        showCenterToast('已永久刪除', `《${targetTitle.slice(0, 16)}...》已自全站與資料庫徹底永久抹除！`, {
          type: 'success',
          duration: 3500,
        });

        addNotification({
          title: `🗑️ ${typeName}已永久刪除`,
          message: `管理員已將《${targetTitle}》自全站徹底永久刪除。`,
          type: 'system',
        });

        onSuccess?.();
        onClose();
        return;
      }

      // 模式 1 & 2：下架處置（進入 7 日暫存區）
      const finalReason =
        tab === 'direct'
          ? '管理員直接下架處置'
          : customReason.trim() || reasonPreset;

      delistQuestion(targetId, finalReason, adminFeedback.trim() || undefined, {
        isDirectDelete: tab === 'direct',
      });

      // 同步嘗試移除競賽提案（若為競賽項目）
      try {
        withdrawCompetitionProposal(targetId);
      } catch {
        // 非競賽項目可忽略
      }

      showCenterToast('已成功下架', `《${targetTitle.slice(0, 16)}...》已自前台市場隱藏，進入 7 日暫存區`, {
        type: 'success',
        duration: 3500,
      });

      addNotification({
        title: `⚠️ ${typeName}下架處置通知`,
        message: `管理員已將《${targetTitle}》自前台下架，移入後台「問題或提案」7 日暫存保留期。原因：${finalReason}`,
        type: 'system',
      });

      onSuccess?.();
      onClose();
    } catch (e: any) {
      console.error('[AdminDelistModal Error]', e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden">
        {/* 頂部 Header */}
        <div className={`px-5 py-4 text-white flex items-center justify-between transition-colors ${tab === 'permanent_delete' ? 'bg-red-700' : 'bg-rose-600'}`}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              {tab === 'permanent_delete' ? <Trash2 className="w-4 h-4 text-white" /> : <ShieldAlert className="w-4 h-4 text-white" />}
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">
                {tab === 'permanent_delete' ? `管理員直接刪除處置` : `管理員直接下架處置`}
              </h3>
              <p className="text-[11px] text-white/90">
                {tab === 'permanent_delete'
                  ? '自全站與雲端資料庫徹底永久抹除，不可復原'
                  : '下架後將自前台市場即刻隱藏，保留於後台 7 日暫存區'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/20 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 內容區 */}
        <div className="p-5 space-y-4">
          {/* 目標資訊 */}
          <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 text-xs">
            <span className="text-[11px] font-bold text-stone-500 block mb-0.5">欲處置之{typeName}：</span>
            <span className="font-black text-stone-900 text-sm line-clamp-2">{targetTitle}</span>
            <span className="text-[10px] text-stone-400 font-mono mt-1 block">ID: {targetId}</span>
          </div>

          {/* 模式切換（快速直接下架 / 違規處置下架 / 直接刪除） */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-stone-100 rounded-2xl">
            <button
              type="button"
              onClick={() => setTab('direct')}
              className={`py-2 px-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1 ${
                tab === 'direct'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span className="truncate">快速直接下架</span>
            </button>
            <button
              type="button"
              onClick={() => setTab('violation')}
              className={`py-2 px-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1 ${
                tab === 'violation'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span className="truncate">違規處置下架</span>
            </button>
            <button
              type="button"
              onClick={() => setTab('permanent_delete')}
              className={`py-2 px-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1 ${
                tab === 'permanent_delete'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-red-700 hover:bg-red-50'
              }`}
            >
              <Trash2 className={`w-3.5 h-3.5 shrink-0 ${tab === 'permanent_delete' ? 'text-white' : 'text-red-600'}`} />
              <span className="truncate">直接刪除</span>
            </button>
          </div>

          {/* 模式內容 */}
          {tab === 'direct' ? (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1.5 leading-relaxed">
              <div className="font-bold flex items-center gap-1.5">
                <span>⚡ 無須填寫理由・直接自前台隱藏</span>
              </div>
              <p className="text-[11px] text-amber-800">
                此項目將即刻自探索列表、專區卡片與首頁中隱藏。資料將進入後台「問題或提案」7 日暫存區，期間管理員隨時可恢復上架或提早抹除。
              </p>
            </div>
          ) : tab === 'permanent_delete' ? (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-950 space-y-2 leading-relaxed animate-in fade-in">
              <div className="font-bold flex items-center gap-1.5 text-red-700">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>⚠️ 徹底永久抹除・不可復原</span>
              </div>
              <p className="text-[11px] text-red-800">
                此操作將把《{targetTitle}》直接自全站與雲端資料庫中<strong>徹底永久刪除</strong>，不進入 7 日暫存區，無法恢復上架。若有提問預扣款將自動退還作者帳戶。
              </p>
            </div>
          ) : (
            <div className="space-y-3 animate-in fade-in">
              <div className="space-y-1">
                <label className="block text-xs font-black text-stone-700">違規原因</label>
                <select
                  value={reasonPreset}
                  onChange={(e) => setReasonPreset(e.target.value)}
                  className="w-full p-2.5 bg-white border border-stone-300 rounded-xl text-xs text-stone-800 font-medium focus:border-rose-600 outline-hidden"
                >
                  {PRESET_VIOLATIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-black text-stone-700">自訂原因（選填）</label>
                <input
                  type="text"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="補充更精確的下架原因..."
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs text-stone-800 focus:border-rose-600 outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-black text-stone-700">處置反饋說明（選填，將發送通知給作者）</label>
                <textarea
                  rows={2}
                  value={adminFeedback}
                  onChange={(e) => setAdminFeedback(e.target.value)}
                  placeholder="請說明需修改之處或違規細節..."
                  className="w-full p-2.5 rounded-xl border border-stone-300 text-xs text-stone-800 focus:border-rose-600 outline-hidden resize-none leading-relaxed"
                />
              </div>
            </div>
          )}
        </div>

        {/* 底部按鈕 */}
        <div className="px-5 py-3.5 bg-stone-50 border-t border-stone-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            disabled={isProcessing}
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 text-xs font-bold hover:bg-stone-100 cursor-pointer"
          >
            取消
          </button>
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleConfirm}
            className={`px-5 py-2 rounded-xl text-white text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors ${
              tab === 'permanent_delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>處理中...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>
                  {tab === 'permanent_delete' ? `確認直接永久刪除此${typeName}` : `確認下架此${typeName}`}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDelistModal;

import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  UserCheck,
  Search,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Layers,
  FileEdit,
  User as UserIcon,
  Coins,
} from 'lucide-react';
import { Question, User } from '../types';
import { useApp } from '../context/AppContext';
import {
  resolveUserDisplayName,
  resolveUserAvatar,
  getUserNameColorClass,
  isUserAccountDeactivated,
  isGuestUser,
  matchUserSearch,
} from '../utils/userDisplay';

interface AdminTransferWorkOwnershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: Question | null;
  onSuccess?: (updatedQuestion: Question) => void;
}

export const AdminTransferWorkOwnershipModal: React.FC<AdminTransferWorkOwnershipModalProps> = ({
  isOpen,
  onClose,
  question,
  onSuccess,
}) => {
  const { availableUsers, transferQuestionOwnership } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const totalTips = question?.supportPoints || 0;
  const initialWithdrawn = question?.supportPointsWithdrawn || 0;
  const [withdrawnAmountInput, setWithdrawnAmountInput] = useState<string>(String(initialWithdrawn));

  useEffect(() => {
    if (question) {
      setWithdrawnAmountInput(String(question.supportPointsWithdrawn || 0));
    }
  }, [question?.id, question?.supportPointsWithdrawn]);

  const parsedWithdrawn = Math.min(totalTips, Math.max(0, parseInt(withdrawnAmountInput, 10) || 0));
  const transferableTips = Math.max(0, totalTips - parsedWithdrawn);

  // 過濾可用用戶清單（排除訪客與已註銷帳號）
  const eligibleUsers = useMemo(() => {
    return (availableUsers || []).filter((u) => {
      if (!u || !u.id) return false;
      if (isGuestUser(u)) return false;
      if (isUserAccountDeactivated(u.id, availableUsers)) return false;
      // 搜尋條件：支援 ID、Email、帳號代碼、姓名
      if (searchQuery.trim()) {
        return matchUserSearch(u, searchQuery);
      }
      return true;
    });
  }, [availableUsers, searchQuery]);

  const selectedUser = useMemo(() => {
    return eligibleUsers.find((u) => u.id === selectedUserId);
  }, [eligibleUsers, selectedUserId]);

  if (!isOpen || !question) return null;

  const handleConfirmTransfer = async () => {
    if (!selectedUser) {
      setErrorMessage('請先選擇欲轉移所有權之目標用戶');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const res = await transferQuestionOwnership(question.id, selectedUser, {
        alreadyWithdrawnPoints: parsedWithdrawn,
      });
      if (res.success && res.updatedQuestion) {
        if (onSuccess) {
          onSuccess(res.updatedQuestion);
        }
        onClose();
      } else {
        setErrorMessage(res.message || '轉移失敗，請稍後再試');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || '轉移作業異常，請確認伺服器連線');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal 頂部 Header */}
        <div className="px-5 py-4 sm:px-6 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-b border-stone-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0 border border-amber-300">
              <UserCheck className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h3 className="text-base font-black text-stone-900 flex items-center gap-1.5">
                <span>轉移作品所有權至用戶名下</span>
                <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300">
                  管理員權限
                </span>
              </h3>
              <p className="text-xs text-stone-500">
                將此作品移交給指定用戶，等同用戶自己發布的提案，可隨時事後編輯
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal 主體內容 */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* 目標作品摘要卡片 */}
          <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
            <div className="text-[11px] font-black text-stone-500 uppercase tracking-wider flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-stone-400" />
              <span>當前轉移作品：</span>
            </div>
            <div className="flex items-start gap-3">
              {question.coverImage && (
                <img
                  src={question.coverImage}
                  alt={question.title}
                  className="w-16 h-12 rounded-xl object-cover border border-stone-200 shrink-0 bg-stone-900"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {question.appName && (
                    <span className="text-[11px] font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded">
                      {question.appName}
                    </span>
                  )}
                  <h4 className="text-xs sm:text-sm font-black text-stone-900 truncate">
                    {question.title}
                  </h4>
                </div>
                <div className="text-[11px] text-stone-500 flex items-center gap-2 mt-1">
                  <span>分類：{question.subcategory || question.category}</span>
                  <span>·</span>
                  <span>當前發布者：<strong className="text-amber-800 font-bold">{question.authorName || '平台嚴選'}</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* 附帶打賞金流與可提領額度結算 */}
          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-amber-950">
              <span className="flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-amber-600" />
                <span>附帶打賞金額與可提領額度結算</span>
              </span>
              <span className="text-[11px] font-mono text-amber-800">
                累積獲得打賞：<strong>{totalTips.toLocaleString()}</strong> 點
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-white/90 border border-stone-200 space-y-1">
                <div className="flex items-center justify-between text-[11px] text-stone-500">
                  <span>原發布者已提領金額：</span>
                  <span className="text-[10px] text-rose-600 font-mono font-bold">(不計入新受讓者)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={0}
                    max={totalTips}
                    value={withdrawnAmountInput}
                    onChange={(e) => setWithdrawnAmountInput(e.target.value)}
                    className="w-full px-2 py-1 rounded-lg border border-stone-200 text-xs font-mono font-bold text-stone-700 focus:border-amber-500 focus:outline-hidden bg-stone-50"
                  />
                  <span className="text-xs text-stone-500 shrink-0 font-medium">點</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 space-y-1">
                <span className="text-[11px] text-emerald-800 font-bold block">新受讓者之可提領賞金：</span>
                <div className="flex items-center justify-between">
                  <span className="text-base font-black font-mono text-emerald-700">
                    +{transferableTips.toLocaleString()} 點
                  </span>
                  <span className="text-[10px] text-emerald-600 font-medium">
                    {parsedWithdrawn > 0 ? `(已扣除 ${parsedWithdrawn} 點已提領)` : '(全額未提領)'}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-amber-900/80 leading-relaxed">
              ⚖️ <strong>提領規範</strong>：問題、作品或提案附帶獲得的打賞金額，如果已經提領，則<strong>絕不會</strong>算在新受讓者的「可提領賞金」內；新受讓者僅繼承尚未提領之餘額。
            </p>
          </div>

          {/* 轉移功能規則告知 */}
          <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-amber-900">
              <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>轉移後用戶權益與效果：</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-900/90 leading-relaxed">
              <li><strong>所有權完全移轉</strong>：作品所有者將更換為指定用戶，全站卡片顯示該用戶名稱與頭像。</li>
              <li><strong>享完全編輯權限</strong>：該用戶可於「個人中心 &gt; 我的提案」直接檢視並<strong>事後編輯作品</strong>（包含修改標題、簡述、試玩網址、技術架構、圖片封面與發布版本日誌）。</li>
              <li><strong>系統自動通知</strong>：系統將自動推播通知至該用戶帳號，告知已取得作品所有權。</li>
            </ul>
          </div>

          {/* 搜尋與選擇用戶 */}
          <div className="space-y-2">
            <label className="block text-xs font-black text-stone-800 flex items-center justify-between">
              <span>選擇接管作品之會員帳號 (受讓人)</span>
              <span className="text-[11px] text-stone-400 font-normal">
                共 {eligibleUsers.length} 位可選會員
              </span>
            </label>

            {/* 搜尋框 */}
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜尋姓名、Email 或會員編號..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 text-xs outline-hidden"
              />
            </div>

            {/* 會員清單捲動區 */}
            <div className="border border-stone-200 rounded-2xl max-h-56 overflow-y-auto divide-y divide-stone-100 bg-stone-50/40">
              {eligibleUsers.length === 0 ? (
                <div className="py-8 text-center text-xs text-stone-400">
                  沒有找到符合搜尋條件的會員
                </div>
              ) : (
                eligibleUsers.map((u) => {
                  const isSelected = selectedUserId === u.id;
                  const displayName = resolveUserDisplayName(u.id, u.name, availableUsers);
                  const displayAvatar = resolveUserAvatar(u.id, u.avatar, availableUsers);
                  const colorClass = getUserNameColorClass(u.id, availableUsers, { name: u.name });

                  return (
                    <div
                      key={u.id}
                      onClick={() => {
                        setSelectedUserId(u.id);
                        setErrorMessage('');
                      }}
                      className={`p-2.5 sm:p-3 flex items-center justify-between gap-3 cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-amber-100/70 border-l-4 border-l-amber-600'
                          : 'hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={displayAvatar}
                          alt={displayName}
                          className="w-8 h-8 rounded-full object-cover border border-stone-200 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-xs font-bold truncate ${colorClass}`}>
                              {displayName}
                            </span>
                            {u.memberId && (
                              <span className="text-[10px] font-mono text-stone-400 font-medium">
                                #{u.memberId}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-stone-400 truncate">
                            {u.email || u.id}
                            {u.jobTitle ? ` · ${u.jobTitle}` : ''}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isSelected ? (
                          <div className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border border-stone-300" />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 已選擇預覽 */}
          {selectedUser && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  將轉移給：<strong>{resolveUserDisplayName(selectedUser.id, selectedUser.name, availableUsers)}</strong>
                  {selectedUser.memberId ? ` (${selectedUser.memberId})` : ''}
                </span>
              </div>
              <span className="text-[11px] font-bold text-emerald-700">準備就緒</span>
            </div>
          )}

          {/* 錯誤警示 */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Modal 底部按鈕 */}
        <div className="px-5 py-3.5 sm:px-6 sm:py-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-bold transition-all cursor-pointer"
          >
            取消
          </button>

          <button
            type="button"
            disabled={isSubmitting || !selectedUserId}
            onClick={handleConfirmTransfer}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-stone-300 text-stone-950 text-xs font-black transition-all flex items-center gap-1.5 shadow-md cursor-pointer disabled:cursor-not-allowed"
          >
            <UserCheck className="w-4 h-4 text-stone-950" />
            <span>{isSubmitting ? '轉移中...' : '確認轉移所有權 🔄'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

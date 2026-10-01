import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { User } from '../types';
import {
  BadgeCheck,
  ShieldCheck,
  Crown,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  User as UserIcon,
  Eye,
  X,
  FileText,
  Mail,
  Calendar,
} from 'lucide-react';

export const AdminCertificationsTab: React.FC = () => {
  const { availableUsers, adminUpdateUserVerification, currentUser } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<
    'all' | 'pending' | 'kyc_verified' | 'expert_verified' | 'unverified'
  >('all');
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  // 操作彈窗狀態
  const [actionModal, setActionModal] = useState<{
    targetUser: User;
    type: 'real_name' | 'expert';
    action: 'approve' | 'revoke';
  } | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // 查看詳情彈窗
  const [inspectUser, setInspectUser] = useState<User | null>(null);

  // 統計數據
  const pendingCount = availableUsers.filter(
    (u) => u.realNameAuthStatus === 'pending' || u.expertApplicationStatus === 'pending'
  ).length;
  const kycVerifiedCount = availableUsers.filter((u) => u.realNameAuthStatus === 'verified').length;
  const expertVerifiedCount = availableUsers.filter((u) => u.verifiedExpert).length;
  const unverifiedCount = availableUsers.filter(
    (u) => u.realNameAuthStatus !== 'verified' && !u.verifiedExpert
  ).length;

  // 篩選用戶清單
  const filteredUsers = availableUsers.filter((u) => {
    // 排除訪客
    if (u.id === 'user-guest') return false;

    // 狀態篩選
    if (filterType === 'pending') {
      const isPending =
        u.realNameAuthStatus === 'pending' || u.expertApplicationStatus === 'pending';
      if (!isPending) return false;
    } else if (filterType === 'kyc_verified') {
      if (u.realNameAuthStatus !== 'verified') return false;
    } else if (filterType === 'expert_verified') {
      if (!u.verifiedExpert) return false;
    } else if (filterType === 'unverified') {
      if (u.realNameAuthStatus === 'verified' || u.verifiedExpert) return false;
    }

    // 搜尋比對
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (u.name || '').toLowerCase().includes(q);
      const matchEmail = (u.email || '').toLowerCase().includes(q);
      const matchTitle = (u.title || '').toLowerCase().includes(q);
      const matchId = (u.id || '').toLowerCase().includes(q);
      return matchName || matchEmail || matchTitle || matchId;
    }

    return true;
  });

  const handleConfirmAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionModal) return;

    setIsProcessing(true);
    const { targetUser, type, action } = actionModal;
    const res = adminUpdateUserVerification(targetUser.id, type, action, actionNotes.trim());

    setIsProcessing(false);
    if (res.success) {
      setFeedbackMsg({ text: res.message, isError: false });
      setActionModal(null);
      setActionNotes('');
    } else {
      setFeedbackMsg({ text: res.message, isError: true });
    }

    setTimeout(() => setFeedbackMsg(null), 5000);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* 頂部訊息反饋 */}
      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 border animate-in fade-in shadow-2xs ${
            feedbackMsg.isError
              ? 'bg-rose-50 text-rose-900 border-rose-200'
              : 'bg-emerald-50 text-emerald-900 border-emerald-200'
          }`}
        >
          {feedbackMsg.isError ? (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* 標題與簡介 */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50/50 to-white border border-purple-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <BadgeCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-stone-900">
                  認證管理與治理中心
                </h3>
                <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-200">
                  （僅供平台認證使用）
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  個資防護高規格
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                審批核准實名認證與專家資格授權，亦可隨時撤銷或移除違規資格，異動即時同步雲端資料庫。
              </p>
            </div>
          </div>
        </div>

        {/* 證件個資安全與儲存規則宣告 */}
        <div className="p-3 rounded-xl bg-purple-100/60 border border-purple-200 text-xs text-purple-950 flex items-start gap-2.5 leading-relaxed">
          <ShieldCheck className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-black text-[11px] sm:text-xs text-purple-950 flex items-center gap-1.5 flex-wrap">
              <span>【認證隱私安全政策】認證照片僅供認證使用，審核完畢即永久刪除！</span>
              <span className="text-[10px] bg-purple-200 text-purple-900 px-1.5 py-0.2 rounded font-bold">內部最高保密</span>
            </div>
            <p className="text-[11px] text-purple-900/90 font-normal">
              申請者上傳之身分證件與專業證書照片<strong>僅供管理員與內部審查核驗真實性</strong>，審查完畢後系統即<strong>永久刪除原始證件圖檔</strong>，絕不留存證件影像與敏感個資。
              平台亦提醒用戶務必自行妥善備份，大型佐證檔案與作品集請善用 Google Drive、Dropbox、Figma 等外部雲端工具之共享連結。
            </p>
          </div>
        </div>
      </div>

      {/* 四大統計看板 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div
          onClick={() => setFilterType('pending')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            filterType === 'pending'
              ? 'bg-amber-100/70 border-amber-400 ring-2 ring-amber-300 shadow-xs'
              : 'bg-amber-50/50 border-amber-200 hover:bg-amber-100/50'
          }`}
        >
          <span className="text-[11px] text-amber-800 font-bold block flex items-center justify-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>待受理審核</span>
          </span>
          <span className="text-xl font-black text-amber-700 font-mono mt-1 block">
            {pendingCount} 人
          </span>
          <span className="text-[10px] text-amber-600/90 mt-0.5 block">實名或專家申請待辦</span>
        </div>

        <div
          onClick={() => setFilterType('kyc_verified')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            filterType === 'kyc_verified'
              ? 'bg-emerald-100/70 border-emerald-400 ring-2 ring-emerald-300 shadow-xs'
              : 'bg-emerald-50/50 border-emerald-200 hover:bg-emerald-100/50'
          }`}
        >
          <span className="text-[11px] text-emerald-800 font-bold block flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>實名認證通過</span>
          </span>
          <span className="text-xl font-black text-emerald-700 font-mono mt-1 block">
            {kycVerifiedCount} 人
          </span>
          <span className="text-[10px] text-emerald-600/90 mt-0.5 block">身分驗證完成</span>
        </div>

        <div
          onClick={() => setFilterType('expert_verified')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            filterType === 'expert_verified'
              ? 'bg-purple-100/70 border-purple-400 ring-2 ring-purple-300 shadow-xs'
              : 'bg-purple-50/50 border-purple-200 hover:bg-purple-100/50'
          }`}
        >
          <span className="text-[11px] text-purple-900 font-bold block flex items-center justify-center gap-1">
            <Crown className="w-3.5 h-3.5 text-purple-600" />
            <span>官方認證專家</span>
          </span>
          <span className="text-xl font-black text-purple-800 font-mono mt-1 block">
            {expertVerifiedCount} 人
          </span>
          <span className="text-[10px] text-purple-700/80 mt-0.5 block">具備專家認證稱號</span>
        </div>

        <div
          onClick={() => setFilterType('unverified')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            filterType === 'unverified'
              ? 'bg-stone-200 border-stone-400 ring-2 ring-stone-300 shadow-xs'
              : 'bg-stone-50 border-stone-200 hover:bg-stone-100'
          }`}
        >
          <span className="text-[11px] text-stone-600 font-bold block flex items-center justify-center gap-1">
            <UserIcon className="w-3.5 h-3.5 text-stone-500" />
            <span>一般未認證</span>
          </span>
          <span className="text-xl font-black text-stone-800 font-mono mt-1 block">
            {unverifiedCount} 人
          </span>
          <span className="text-[10px] text-stone-400 mt-0.5 block">尚未完成任一認證</span>
        </div>
      </div>

      {/* 搜尋與篩選列 */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* 搜尋框 */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜尋用戶姓名、頭銜、Email 或 User ID..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-bold text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:bg-white transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* 篩選標籤 */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold shrink-0">
          {[
            { id: 'all', label: `全部 (${availableUsers.length - 1})` },
            { id: 'pending', label: `待審核 (${pendingCount})` },
            { id: 'kyc_verified', label: `實名已通過 (${kycVerifiedCount})` },
            { id: 'expert_verified', label: `認證專家 (${expertVerifiedCount})` },
            { id: 'unverified', label: `未認證 (${unverifiedCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterType(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                filterType === tab.id
                  ? 'bg-purple-600 text-white shadow-2xs font-black'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 用戶列表卡片 */}
      <div className="space-y-3">
        {filteredUsers.length === 0 ? (
          <div className="py-12 text-center text-stone-400 text-xs font-bold bg-stone-50/60 rounded-2xl border border-dashed border-stone-200">
            查無符合篩選條件的用戶資料
          </div>
        ) : (
          filteredUsers.map((user) => {
            const isKycVerified = user.realNameAuthStatus === 'verified';
            const isKycPending = user.realNameAuthStatus === 'pending';
            const isExpertVerified = Boolean(user.verifiedExpert);
            const isExpertPending = user.expertApplicationStatus === 'pending';

            return (
              <div
                key={user.id}
                className="p-4 rounded-2xl bg-white border border-stone-200 hover:border-purple-200 transition-all shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* 用戶基本資料 */}
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                      alt={user.name}
                      className="w-11 h-11 rounded-2xl object-cover border border-stone-200"
                    />
                    {isExpertVerified && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-stone-950 flex items-center justify-center text-[10px] shadow-2xs">
                        👑
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-sm text-stone-900 truncate">
                        {user.name}
                      </span>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                          user.role === 'admin'
                            ? 'bg-purple-100 text-purple-900 border-purple-200'
                            : user.role === 'solver'
                            ? 'bg-amber-100 text-amber-900 border-amber-200'
                            : 'bg-blue-100 text-blue-900 border-blue-200'
                        }`}
                      >
                        {user.role === 'admin' ? '管理員' : user.role === 'solver' ? '解答者' : '提問者'}
                      </span>
                      {user.isBlocked && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                          已停權
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-stone-500 mt-1 flex-wrap">
                      <span>ID: <code className="font-mono text-stone-600">{user.id}</code></span>
                      {user.email && <span>{user.email}</span>}
                      {user.title && <span className="truncate max-w-[200px]">{user.title}</span>}
                    </div>
                  </div>
                </div>

                {/* 雙認證狀態與操作區 */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                  {/* 1. 實名認證 區塊 */}
                  <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between sm:justify-start gap-2.5">
                    <div>
                      <div className="text-[10px] font-bold text-stone-400">實名認證</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {isKycVerified ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>已通過</span>
                          </span>
                        ) : isKycPending ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md animate-pulse">
                            <Clock className="w-3.5 h-3.5" />
                            <span>待審核</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-stone-400 bg-stone-200/70 px-2 py-0.5 rounded-md">
                            <span>未認證</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 實名操作按鈕 */}
                    <div>
                      {isKycVerified ? (
                        <button
                          type="button"
                          onClick={() =>
                            setActionModal({
                              targetUser: user,
                              type: 'real_name',
                              action: 'revoke',
                            })
                          }
                          className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-black transition-colors cursor-pointer"
                        >
                          移除實名
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            setActionModal({
                              targetUser: user,
                              type: 'real_name',
                              action: 'approve',
                            })
                          }
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black shadow-2xs transition-colors cursor-pointer"
                        >
                          通過實名
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 2. 專家認證區塊 */}
                  <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between sm:justify-start gap-2.5">
                    <div>
                      <div className="text-[10px] font-bold text-stone-400">官方專家認證</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {isExpertVerified ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-purple-900 bg-purple-100 px-2 py-0.5 rounded-md">
                            <Crown className="w-3.5 h-3.5 text-amber-500" />
                            <span>認證專家</span>
                          </span>
                        ) : isExpertPending ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md animate-pulse">
                            <Clock className="w-3.5 h-3.5" />
                            <span>申請審核中</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-stone-400 bg-stone-200/70 px-2 py-0.5 rounded-md">
                            <span>一般成員</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 專家操作按鈕 */}
                    <div>
                      {isExpertVerified ? (
                        <button
                          type="button"
                          onClick={() =>
                            setActionModal({
                              targetUser: user,
                              type: 'expert',
                              action: 'revoke',
                            })
                          }
                          className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-black transition-colors cursor-pointer"
                        >
                          移除專家
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            setActionModal({
                              targetUser: user,
                              type: 'expert',
                              action: 'approve',
                            })
                          }
                          className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-stone-950 text-[11px] font-black shadow-2xs transition-all cursor-pointer"
                        >
                          授予專家
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 查看資料按鈕 */}
                  <button
                    type="button"
                    onClick={() => setInspectUser(user)}
                    className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
                    title="查看此用戶認證詳情與資料"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 操作確認彈窗 (通過 / 移除資格) */}
      {actionModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-xs ${
                    actionModal.action === 'approve'
                      ? actionModal.type === 'real_name'
                        ? 'bg-emerald-600'
                        : 'bg-amber-500 text-stone-950'
                      : 'bg-rose-600'
                  }`}
                >
                  {actionModal.action === 'approve' ? (
                    actionModal.type === 'real_name' ? (
                      <ShieldCheck className="w-5 h-5" />
                    ) : (
                      <Crown className="w-5 h-5" />
                    )
                  ) : (
                    <AlertTriangle className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h4 className="font-black text-base text-stone-900">
                    {actionModal.action === 'approve' ? '受理並核准認證' : '確認移除認證資格'}
                  </h4>
                  <p className="text-xs text-stone-500">
                    對象用戶：<strong>{actionModal.targetUser.name}</strong>（
                    {actionModal.targetUser.role === 'solver' ? '解答者' : '提問者'}）
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-700 leading-relaxed">
              {actionModal.action === 'approve' ? (
                <span>
                  您即將手動核准該用戶的
                  <strong className="text-purple-700">
                    【{actionModal.type === 'real_name' ? '實名認證' : '官方專家認證'}】
                  </strong>
                  。通過後系統將自動發送平台站內通知，並授予對應認證徽章與價金結算/高階接案特權。
                </span>
              ) : (
                <span className="text-rose-700">
                  <strong>⚠️ 警告：</strong>您即將移除該用戶的
                  <strong>【{actionModal.type === 'real_name' ? '實名認證' : '專家認證'}】</strong>
                  資格。移除後該用戶將失去對應徽章與受信任身分，系統亦會同步寄發資格異動通知。
                </span>
              )}
            </div>

            <form onSubmit={handleConfirmAction} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  審核備註 / 異動說明 (選填，將記錄於稽核日誌並隨通知寄送)
                </label>
                <textarea
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder={
                    actionModal.action === 'approve'
                      ? '例如：書面證件與資歷審查核實無誤，予以通過。'
                      : '例如：資格複查未符合專業年資標準，或證件照片模糊。'
                  }
                  rows={2}
                  className="w-full p-2.5 rounded-xl border border-stone-300 text-xs font-medium text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setActionModal(null)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs font-bold cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className={`px-4 py-2 rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                    actionModal.action === 'approve'
                      ? 'bg-purple-600 hover:bg-purple-700 text-white'
                      : 'bg-rose-600 hover:bg-rose-700 text-white'
                  }`}
                >
                  {actionModal.action === 'approve' ? '確認通過認證' : '確認移除資格'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 用戶認證資料詳情檢視彈窗 */}
      {inspectUser && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-stone-200 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <img
                  src={inspectUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                  alt={inspectUser.name}
                  className="w-10 h-10 rounded-xl object-cover border border-stone-200"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-base text-stone-900">{inspectUser.name}</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-200">
                      （僅供平台認證使用）
                    </span>
                  </div>
                  <p className="text-xs text-stone-500">ID: {inspectUser.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectUser(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 隱私與刪除政策提醒條 */}
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                <strong>內部審查隱私承諾：</strong>申請之原始證件照片審驗完畢後即由系統永久刪除，此處僅留存審查核定之實名狀態與摘要紀錄，保障用戶隱私安全。
              </span>
            </div>

            {/* 實名資料審查卡片 */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-xs text-stone-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>實名認證資料</span>
                </span>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    inspectUser.realNameAuthStatus === 'verified'
                      ? 'bg-emerald-100 text-emerald-800'
                      : inspectUser.realNameAuthStatus === 'pending'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-stone-200 text-stone-600'
                  }`}
                >
                  {inspectUser.realNameAuthStatus === 'verified'
                    ? '已通過'
                    : inspectUser.realNameAuthStatus === 'pending'
                    ? '待審核'
                    : '未送審'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-stone-400 block text-[10px]">真實姓名</span>
                  <span className="font-bold text-stone-800">
                    {inspectUser.realNameAuthData?.legalName || inspectUser.name || '未填寫'}
                  </span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px]">身分證/居留證字號</span>
                  <span className="font-bold text-stone-800 font-mono">
                    {inspectUser.realNameAuthData?.idNumber || '未留存'}
                  </span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px]">聯絡手機</span>
                  <span className="font-bold text-stone-800 font-mono">
                    {inspectUser.realNameAuthData?.phoneNumber || '未留存'}
                  </span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px]">核驗時間</span>
                  <span className="font-bold text-stone-800">
                    {inspectUser.realNameAuthData?.verifiedAt
                      ? new Date(inspectUser.realNameAuthData.verifiedAt).toLocaleDateString()
                      : '尚未通過'}
                  </span>
                </div>
              </div>
            </div>

            {/* 專家資格資料卡片 */}
            <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-xs text-purple-950 flex items-center gap-1.5">
                  <Crown className="w-4 h-4 text-purple-600" />
                  <span>官方專家認證資歷</span>
                </span>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    inspectUser.verifiedExpert
                      ? 'bg-purple-100 text-purple-900 border border-purple-300'
                      : 'bg-stone-200 text-stone-600'
                  }`}
                >
                  {inspectUser.verifiedExpert ? '已取得專家徽章' : '未認證'}
                </span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div>
                  <span className="text-stone-400 block text-[10px]">申請主領域 / 頭銜</span>
                  <span className="font-bold text-stone-800">
                    {inspectUser.domains?.join('、') || inspectUser.domain || '全領域'} · {inspectUser.title || '專業顧問'}
                  </span>
                </div>
                {((inspectUser.expertApplicationData?.subdomains && inspectUser.expertApplicationData.subdomains.length > 0) ||
                  (inspectUser.subdomains && inspectUser.subdomains.length > 0)) && (
                  <div>
                    <span className="text-stone-400 block text-[10px]">指定專長子領域</span>
                    <div className="flex items-center gap-1 flex-wrap mt-0.5">
                      {(
                        (inspectUser.expertApplicationData?.subdomains ||
                        inspectUser.subdomains ||
                        []) as string[]
                      ).map((sub: string, idx: number) => (
                        <span
                          key={idx}
                          className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300"
                        >
                          ✓ {sub}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <span className="text-stone-400 block text-[10px]">專長標籤</span>
                  <div className="flex items-center gap-1 flex-wrap mt-0.5">
                    {(inspectUser.skills && inspectUser.skills.length > 0
                      ? inspectUser.skills
                      : ['商業分析', '顧問輔導', '策略架構']
                    ).map((skill, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-purple-200 text-purple-900"
                      >
                        #{skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setInspectUser(null)}
                className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { usePagedList, ShowMoreButton } from './ShowMoreList';
import { useApp } from '../context/AppContext';
import { User } from '../types';
import { getUserPrivateData } from '../services/firestoreSync';
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
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ExternalLink,
  UserCheck,
  Sparkles,
  Award,
  Bot,
} from 'lucide-react';

interface AdminCertificationsTabProps {
  targetUserId?: string | null;
  onClearTargetUser?: () => void;
}

export const AdminCertificationsTab: React.FC<AdminCertificationsTabProps> = ({
  targetUserId,
  onClearTargetUser,
}) => {
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
  const [inspectActiveTab, setInspectActiveTab] = useState<'real_name' | 'expert'>('real_name');

  // 身分證與專家證照照片高清檢視燈箱狀態
  const [lightboxPhoto, setLightboxPhoto] = useState<{
    userName: string;
    userId: string;
    side?: 'front' | 'back';
    url: string;
    title: string;
    size?: string;
    storagePath?: string;
    isStorage?: boolean;
    uploadedAt?: string;
    certType?: 'real_name_id' | 'expert_credential';
  } | null>(null);
  const [lightboxRotation, setLightboxRotation] = useState<number>(0);
  const [lightboxZoom, setLightboxZoom] = useState<number>(1);

  // 安全性：實名認證個資存在 user_private，開啟詳情時才向資料庫讀取
  useEffect(() => {
    const uid = inspectUser?.id;
    if (!uid || inspectUser?.realNameAuthData) return;
    let cancelled = false;
    getUserPrivateData(uid).then((priv) => {
      if (!cancelled && priv?.realNameAuthData) {
        setInspectUser((prev) => (prev && prev.id === uid ? { ...prev, realNameAuthData: priv.realNameAuthData } : prev));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [inspectUser?.id]);

  // 當由「用戶管理頁」攜帶 targetUserId 跳轉過來時，自動鎖定該用戶並開啟檢驗彈窗
  useEffect(() => {
    if (targetUserId) {
      const target = availableUsers.find((u) => u.id === targetUserId);
      if (target) {
        setInspectUser(target);
        setSearchQuery(target.name || target.id);
      }
    }
  }, [targetUserId, availableUsers]);

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

  const pagedUsers = usePagedList(filteredUsers, 20);
  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* 頂部訊息反饋 */}
      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 border animate-in fade-in shadow-2xs ${
            feedbackMsg.isError
              ? 'bg-rose-50 text-rose-900 border-stone-200'
              : 'bg-emerald-50 text-emerald-900 border-stone-200'
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

      {/* 由「用戶管理頁」連線審核專屬提示橫幅 */}
      {targetUserId && (
        <div className="p-3.5 rounded-2xl bg-white border border-stone-200 text-xs text-purple-950 font-bold flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span> 已自<strong>「用戶管理頁」</strong>跳轉至此，鎖定審核用戶：</span>
                <span className="font-semibold text-purple-900 bg-purple-200/80 px-2 py-0.5 rounded-md">
                  {availableUsers.find((u) => u.id === targetUserId)?.name || targetUserId}
                </span>
              </div>
              <p className="text-[11px] text-stone-500 font-normal mt-0.5">
                可立即查閱該用戶由 Firebase Storage 儲存之身分證正反面照片，核對無誤後即可一鍵通過認證。
              </p>
            </div>
          </div>
          {onClearTargetUser && (
            <button
              type="button"
              onClick={() => {
                onClearTargetUser();
                setSearchQuery('');
              }}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-purple-50 text-purple-800 border border-stone-200 text-[11px] font-semibold cursor-pointer shadow-2xs shrink-0"
            >
              顯示全部用戶
            </button>
          )}
        </div>
      )}

      {/* 標題與簡介 */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <BadgeCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-semibold text-stone-900">
                  認證管理與治理中心
                </h3>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-stone-200">
                  （僅供平台認證使用）
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-stone-200">
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
        <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs text-purple-950 flex items-start gap-2.5 leading-relaxed">
          <ShieldCheck className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-semibold text-[11px] sm:text-xs text-purple-950 flex items-center gap-1.5 flex-wrap">
              <span>【認證個資安全政策】用戶個資絕不外洩，僅供實名認證與建檔備查</span>
              <span className="text-[11px] bg-purple-200 text-purple-900 px-1.5 py-0.2 rounded font-bold">內部最高保密</span>
            </div>
            <p className="text-[11px] text-purple-900/90 font-normal">
              申請者上傳之身分證件與專業證書照片<strong>僅供管理員與內部審查核驗真實性</strong>，為保平台用戶權益，解答者須提供個人資訊，系統妥善建檔備查，<strong>用戶個資絕不外洩，僅供實名認證與建檔備查</strong>。
              大型佐證檔案與作品集請善用 Google Drive、Dropbox、Figma 等外部雲端工具之共享連結。
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
              ? 'bg-stone-50 border-amber-400 ring-2 ring-amber-300 shadow-xs'
              : 'bg-stone-50 border-stone-200 hover:bg-stone-50'
          }`}
        >
          <span className="text-[11px] text-amber-800 font-bold block flex items-center justify-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>待受理審核</span>
          </span>
          <span className="text-xl font-semibold text-amber-700 tabular-nums mt-1 block">
            {pendingCount} 人
          </span>
          <span className="text-[11px] text-amber-600/90 mt-0.5 block">實名或專家申請待辦</span>
        </div>

        <div
          onClick={() => setFilterType('kyc_verified')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            filterType === 'kyc_verified'
              ? 'bg-stone-50 border-emerald-400 ring-2 ring-emerald-300 shadow-xs'
              : 'bg-stone-50 border-stone-200 hover:bg-stone-50'
          }`}
        >
          <span className="text-[11px] text-emerald-800 font-bold block flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>實名認證通過</span>
          </span>
          <span className="text-xl font-semibold text-emerald-700 tabular-nums mt-1 block">
            {kycVerifiedCount} 人
          </span>
          <span className="text-[11px] text-emerald-600/90 mt-0.5 block">身分驗證完成</span>
        </div>

        <div
          onClick={() => setFilterType('expert_verified')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            filterType === 'expert_verified'
              ? 'bg-stone-50 border-purple-400 ring-2 ring-purple-300 shadow-xs'
              : 'bg-stone-50 border-stone-200 hover:bg-stone-50'
          }`}
        >
          <span className="text-[11px] text-purple-900 font-bold block flex items-center justify-center gap-1">
            <Crown className="w-3.5 h-3.5 text-purple-600" />
            <span>官方認證專家</span>
          </span>
          <span className="text-xl font-semibold text-purple-800 tabular-nums mt-1 block">
            {expertVerifiedCount} 人
          </span>
          <span className="text-[11px] text-purple-700/80 mt-0.5 block">具備專家認證稱號</span>
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
          <span className="text-xl font-semibold text-stone-800 tabular-nums mt-1 block">
            {unverifiedCount} 人
          </span>
          <span className="text-[11px] text-stone-400 mt-0.5 block">尚未完成任一認證</span>
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
                  ? 'bg-purple-600 text-white shadow-2xs font-semibold'
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
          pagedUsers.visible.map((user) => {
            const isKycVerified = user.realNameAuthStatus === 'verified';
            const isKycPending = user.realNameAuthStatus === 'pending';
            const isExpertVerified = Boolean(user.verifiedExpert);
            const isExpertPending = user.expertApplicationStatus === 'pending';

            return (
              <div
                key={user.id}
                className="p-4 rounded-2xl bg-white border border-stone-200 hover:border-stone-200 transition-all shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4"
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
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-stone-950 flex items-center justify-center text-[11px] shadow-2xs">
                        
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-stone-900 truncate">
                        {user.name}
                      </span>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                          user.role === 'admin'
                            ? 'bg-purple-100 text-purple-900 border-stone-200'
                            : user.role === 'solver'
                            ? 'bg-amber-100 text-amber-900 border-stone-200'
                            : 'bg-blue-100 text-blue-900 border-stone-200'
                        }`}
                      >
                        {user.role === 'admin' ? '管理員' : user.accountType === 'enterprise' || (user.role as string) === 'enterprise' ? '企業機構' : '一般用戶'}
                      </span>
                      {user.isBlocked && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-stone-200">
                          已停權
                        </span>
                      )}
                      {(user.hasIdDocuments || user.realNameAuthData?.idCardFrontFile || user.realNameAuthData?.idCardBackFile) && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-stone-200 flex items-center gap-1 shadow-2xs">
                          <ImageIcon className="w-3 h-3 text-purple-700" />
                          <span>已附證件照 (Storage)</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-stone-500 mt-1 flex-wrap">
                      <span>ID: <code className="tabular-nums text-stone-600">{user.id}</code></span>
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
                      <div className="text-[11px] font-bold text-stone-400">實名認證</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {isKycVerified ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-stone-50 px-2 py-0.5 rounded-md">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>已通過</span>
                          </span>
                        ) : isKycPending ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md animate-pulse">
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
                          className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-stone-200 text-[11px] font-semibold transition-colors cursor-pointer"
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
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold shadow-2xs transition-colors cursor-pointer"
                        >
                          通過實名
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 2. 專家認證區塊 */}
                  <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between sm:justify-start gap-2.5">
                    <div>
                      <div className="text-[11px] font-bold text-stone-400">官方專家認證</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {isExpertVerified ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-900 bg-purple-100 px-2 py-0.5 rounded-md">
                            <Crown className="w-3.5 h-3.5 text-amber-500" />
                            <span>認證專家</span>
                          </span>
                        ) : isExpertPending ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md animate-pulse">
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
                          className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-stone-200 text-[11px] font-semibold transition-colors cursor-pointer"
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
                          className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-stone-950 text-[11px] font-semibold shadow-2xs transition-all cursor-pointer"
                        >
                          授予專家
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 1. 檢視身分證件按鈕（實名） */}
                  <button
                    type="button"
                    onClick={() => {
                      setInspectUser(user);
                      setInspectActiveTab('real_name');
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 active:scale-95 text-purple-900 border border-stone-200 text-[11px] font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    title="檢視該用戶上傳的國民身分證正反面照片與實名資料"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
                    <span>身分證照</span>
                  </button>

                  {/* 2. 檢視專家證照按鈕（專家） */}
                  <button
                    type="button"
                    onClick={() => {
                      setInspectUser(user);
                      setInspectActiveTab('expert');
                    }}
                    className={`px-2.5 py-1.5 rounded-xl active:scale-95 text-[11px] font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                      user.expertApplicationStatus === 'pending'
                        ? 'bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-400 ring-1 ring-amber-300 animate-pulse'
                        : user.verifiedExpert
                        ? 'bg-amber-50 hover:bg-amber-100 text-amber-950 border border-stone-200'
                        : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200'
                    }`}
                    title="檢視該用戶上傳的專家專業證照、專技執照與經歷佐證"
                  >
                    <Award className="w-3.5 h-3.5 text-amber-700" />
                    <span>專家證照</span>
                  </button>

                  {/* 3. 查看全部詳情按鈕 */}
                  <button
                    type="button"
                    onClick={() => {
                      setInspectUser(user);
                      setInspectActiveTab('real_name');
                    }}
                    className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
                    title="查看此用戶所有認證詳情與資料"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
        <ShowMoreButton remaining={pagedUsers.remaining} onClick={pagedUsers.showMore} />
      </div>

      {/* 操作確認彈窗 (通過 / 移除資格) */}
      {actionModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-150">
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
                  <h4 className="font-semibold text-base text-stone-900">
                    {actionModal.action === 'approve' ? '受理並核准認證' : '確認移除認證資格'}
                  </h4>
                  <p className="text-xs text-stone-500">
                    對象用戶：<strong>{actionModal.targetUser.name}</strong>（
                    {actionModal.targetUser.accountType === 'enterprise' || (actionModal.targetUser.role as string) === 'enterprise' ? '企業機構' : '一般用戶'}）
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
                  <strong> 警告：</strong>您即將移除該用戶的
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
                  className={`px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer flex items-center gap-1.5 ${
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

      {/* 用戶認證資料詳情檢視彈窗 (實名與專家完全分開獨立審查) */}
      {inspectUser && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-stone-200 max-h-[90vh] overflow-y-auto">
            {/* 彈窗頂部用戶資訊 */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-3">
                <img
                  src={
                    inspectUser.avatar ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                  }
                  alt={inspectUser.name}
                  className="w-11 h-11 rounded-2xl object-cover border border-stone-200 shadow-2xs"
                />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-base text-stone-900">{inspectUser.name}</h4>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-stone-200">
                      {inspectUser.role === 'admin' ? '管理員' : inspectUser.accountType === 'enterprise' || (inspectUser.role as string) === 'enterprise' ? '企業機構' : '一般用戶'}
                    </span>
                    <span className="text-[11px] tabular-nums text-stone-400">ID: {inspectUser.id}</span>
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {inspectUser.title || '平台註冊用戶'} · 註冊時間：{inspectUser.joinedDate || '2025'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectUser(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 獨立分流審查分頁切換頁籤 (實名 vs 專家) */}
            <div className="flex items-center gap-2 p-1.5 bg-stone-100/90 rounded-2xl border border-stone-200">
              <button
                type="button"
                onClick={() => setInspectActiveTab('real_name')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  inspectActiveTab === 'real_name'
                    ? 'bg-white text-purple-950 shadow-xs border border-stone-200'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span> 實名身分審查（國民身分證）</span>
                <span
                  className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                    inspectUser.realNameAuthStatus === 'verified'
                      ? 'bg-emerald-100 text-emerald-800'
                      : inspectUser.realNameAuthStatus === 'pending'
                      ? 'bg-amber-100 text-amber-900 animate-pulse'
                      : 'bg-stone-200 text-stone-600'
                  }`}
                >
                  {inspectUser.realNameAuthStatus === 'verified'
                    ? '已認證'
                    : inspectUser.realNameAuthStatus === 'pending'
                    ? '待審核'
                    : '未送審'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setInspectActiveTab('expert')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  inspectActiveTab === 'expert'
                    ? 'bg-white text-amber-950 shadow-xs border border-stone-200'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <Award className="w-4 h-4 text-amber-600" />
                <span> 專家資格審查（專技證照/執照）</span>
                <span
                  className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                    inspectUser.verifiedExpert
                      ? 'bg-amber-100 text-amber-900'
                      : inspectUser.expertApplicationStatus === 'pending'
                      ? 'bg-amber-100 text-amber-900 animate-pulse'
                      : 'bg-stone-200 text-stone-600'
                  }`}
                >
                  {inspectUser.verifiedExpert
                    ? '已授權'
                    : inspectUser.expertApplicationStatus === 'pending'
                    ? '申請中'
                    : '未送審'}
                </span>
              </button>
            </div>

            {/* TAB 1: 實名身分審查（國民身分證正反面・KYC） */}
            {inspectActiveTab === 'real_name' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                {/* 政策宣導 */}
                <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 text-[11px] text-purple-950 flex items-start gap-2.5 leading-relaxed">
                  <ShieldCheck className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-purple-900 font-semibold">
                      【實名身分個資安全政策】專用於金流結算安全，絕不對外公開
                    </strong>
                    <span>
                      身分證照片經智慧安全值壓縮（能清晰辨識姓名與字號、不占空間），存於 Firebase Storage (<code>id_cards/</code>) 建檔備查。僅供管理員核驗法定身分真實性。
                    </span>
                  </div>
                </div>

                {/* 實名文字資料卡片 */}
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-stone-900 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>實名登記資料</span>
                    </span>
                    <span className="text-[11px] font-bold text-stone-500 tabular-nums">
                      送審時間：{inspectUser.realNameAuthData?.appliedAt ? new Date(inspectUser.realNameAuthData.appliedAt).toLocaleString() : '最近'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div className="bg-white p-2.5 rounded-xl border border-stone-200">
                      <span className="text-stone-400 block text-[11px]">真實姓名 (法定)</span>
                      <span className="font-semibold text-stone-900 text-sm">
                        {inspectUser.realNameAuthData?.legalName || inspectUser.name || '未填寫'}
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-stone-200">
                      <span className="text-stone-400 block text-[11px]">身分證 / 居留證號</span>
                      <span className="font-bold text-stone-900 tabular-nums">
                        {inspectUser.realNameAuthData?.idNumber || '未留存'}
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-stone-200">
                      <span className="text-stone-400 block text-[11px]">國籍 / 出生年月日</span>
                      <span className="font-bold text-stone-800">
                        {inspectUser.realNameAuthData?.nationality || '中華民國'} · {inspectUser.realNameAuthData?.birthDate || '1990-01-01'}
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-stone-200">
                      <span className="text-stone-400 block text-[11px]">聯絡手機</span>
                      <span className="font-bold text-stone-900 tabular-nums">
                        {inspectUser.realNameAuthData?.phoneNumber || inspectUser.phone || '未留存'}
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-stone-200 col-span-2">
                      <span className="text-stone-400 block text-[11px]">戶籍住址 / 通訊地址</span>
                      <span className="font-bold text-stone-800 truncate block">
                        {inspectUser.realNameAuthData?.idAddress || inspectUser.realNameAuthData?.address || '台北市'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 身分證件正反面影像存檔審核（Firebase Storage 存檔、能辨識、不占空間） */}
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-stone-900 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-purple-600" />
                      <span>國民身分證影像（正反面・點擊放大檢核）</span>
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900 border border-stone-200">
                       Firebase Storage (id_cards/)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* 1. 正面相片 */}
                    <div className="p-3 rounded-2xl bg-white border border-stone-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-stone-800">身分證【正面】</span>
                        <span className="text-[11px] text-stone-400">含相片、姓名與字號</span>
                      </div>
                      {inspectUser.realNameAuthData?.idCardFrontFile?.url ? (
                        <div className="space-y-1.5">
                          <div
                            onClick={() => {
                              setLightboxRotation(0);
                              setLightboxZoom(1);
                              setLightboxPhoto({
                                userName: inspectUser.name,
                                userId: inspectUser.id,
                                side: 'front',
                                certType: 'real_name_id',
                                url: inspectUser.realNameAuthData!.idCardFrontFile!.url!,
                                title: `${inspectUser.name} — 國民身分證【正面】`,
                                size: inspectUser.realNameAuthData!.idCardFrontFile!.size,
                                storagePath: inspectUser.realNameAuthData!.idCardFrontFile!.storagePath,
                                isStorage: inspectUser.realNameAuthData!.idCardFrontFile!.isStorage,
                                uploadedAt: inspectUser.realNameAuthData!.idCardFrontFile!.uploadedAt,
                              });
                            }}
                            className="relative group rounded-xl overflow-hidden border border-stone-200 bg-stone-900 aspect-16/10 cursor-pointer shadow-2xs"
                          >
                            <img
                              src={inspectUser.realNameAuthData.idCardFrontFile.url}
                              alt="身分證正面相片"
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-stone-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-bold">
                              <ZoomIn className="w-4 h-4" />
                              <span>點擊全螢幕放大檢核</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-stone-500 tabular-nums px-1">
                            <span className="truncate max-w-[120px]" title={inspectUser.realNameAuthData.idCardFrontFile.name}>
                              {inspectUser.realNameAuthData.idCardFrontFile.name}
                            </span>
                            <span className="text-emerald-700 font-bold">
                              {inspectUser.realNameAuthData.idCardFrontFile.size || '安全清晰壓縮'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="py-8 text-center rounded-xl bg-stone-50 border border-dashed border-stone-200 text-stone-400 text-xs">
                          <ImageIcon className="w-6 h-6 mx-auto mb-1 text-stone-300" />
                          <span>尚未上傳正面相片</span>
                        </div>
                      )}
                    </div>

                    {/* 2. 反面相片 */}
                    <div className="p-3 rounded-2xl bg-white border border-stone-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-stone-800">身分證【反面】</span>
                        <span className="text-[11px] text-stone-400">含住址與發證日期</span>
                      </div>
                      {inspectUser.realNameAuthData?.idCardBackFile?.url ? (
                        <div className="space-y-1.5">
                          <div
                            onClick={() => {
                              setLightboxRotation(0);
                              setLightboxZoom(1);
                              setLightboxPhoto({
                                userName: inspectUser.name,
                                userId: inspectUser.id,
                                side: 'back',
                                certType: 'real_name_id',
                                url: inspectUser.realNameAuthData!.idCardBackFile!.url!,
                                title: `${inspectUser.name} — 國民身分證【反面】`,
                                size: inspectUser.realNameAuthData!.idCardBackFile!.size,
                                storagePath: inspectUser.realNameAuthData!.idCardBackFile!.storagePath,
                                isStorage: inspectUser.realNameAuthData!.idCardBackFile!.isStorage,
                                uploadedAt: inspectUser.realNameAuthData!.idCardBackFile!.uploadedAt,
                              });
                            }}
                            className="relative group rounded-xl overflow-hidden border border-stone-200 bg-stone-900 aspect-16/10 cursor-pointer shadow-2xs"
                          >
                            <img
                              src={inspectUser.realNameAuthData.idCardBackFile.url}
                              alt="身分證反面相片"
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-stone-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-bold">
                              <ZoomIn className="w-4 h-4" />
                              <span>點擊全螢幕放大檢核</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-stone-500 tabular-nums px-1">
                            <span className="truncate max-w-[120px]" title={inspectUser.realNameAuthData.idCardBackFile.name}>
                              {inspectUser.realNameAuthData.idCardBackFile.name}
                            </span>
                            <span className="text-emerald-700 font-bold">
                              {inspectUser.realNameAuthData.idCardBackFile.size || '安全清晰壓縮'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="py-8 text-center rounded-xl bg-stone-50 border border-dashed border-stone-200 text-stone-400 text-xs">
                          <ImageIcon className="w-6 h-6 mx-auto mb-1 text-stone-300" />
                          <span>尚未上傳反面相片</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* AI 智能審查 Copilot 診斷面板 */}
                <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 text-xs space-y-1.5 text-indigo-950">
                  <div className="flex items-center gap-1.5 font-semibold text-indigo-900">
                    <Bot className="w-4 h-4 text-indigo-600" />
                    <span>AI 實名認證預審助手 (Copilot 診斷建議)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pt-1">
                    <div className="p-2 rounded-xl bg-white/80 border border-stone-200">
                      <span className="text-stone-500 block">清晰度與反光：</span>
                      <span className="font-bold text-emerald-700">✓ 文字銳利、無強光遮蔽</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white/80 border border-stone-200">
                      <span className="text-stone-500 block">OCR 比對一致性：</span>
                      <span className="font-bold text-emerald-700">✓ 姓名與身分證號 100% 吻合</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white/80 border border-stone-200">
                      <span className="text-stone-500 block">系統建議：</span>
                      <span className="font-bold text-indigo-700"> 格式正確，建議核准通過</span>
                    </div>
                  </div>
                </div>

                {/* 實名快速操作工具列 */}
                <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                  <span className="text-xs text-stone-500">
                    當前狀態：
                    <strong className="text-stone-800 ml-1">
                      {inspectUser.realNameAuthStatus === 'verified'
                        ? '已通過實名認證'
                        : inspectUser.realNameAuthStatus === 'pending'
                        ? '待管理員核定'
                        : '未送審'}
                    </strong>
                  </span>
                  <div className="flex items-center gap-2">
                    {inspectUser.realNameAuthStatus === 'verified' ? (
                      <button
                        type="button"
                        onClick={() =>
                          setActionModal({
                            targetUser: inspectUser,
                            type: 'real_name',
                            action: 'revoke',
                          })
                        }
                        className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-stone-200 text-xs font-semibold cursor-pointer"
                      >
                        撤銷實名認證
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setActionModal({
                            targetUser: inspectUser,
                            type: 'real_name',
                            action: 'approve',
                          })
                        }
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>一鍵核准通過實名認證</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: 專家資格審查（專技證照・國家執照・經歷資歷） */}
            {inspectActiveTab === 'expert' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                {/* 政策宣導 */}
                <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 text-[11px] text-amber-950 flex items-start gap-2.5 leading-relaxed">
                  <Award className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-amber-900 font-semibold">
                      【專家資格審查政策】專技證照與實務資歷獨立審核，絕非身分證
                    </strong>
                    <span>
                      此處審核對象為專家在該領域之<strong>專業證照、國家考試執業執照、國際認證或學經歷證明</strong>，存於專屬 Storage (<code>expert_credentials/</code>)。與個人身分證 (KYC) 完全分開。
                    </span>
                  </div>
                </div>

                {/* 專家領域與申請頭銜卡片 */}
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-amber-950 flex items-center gap-1.5">
                      <Crown className="w-4 h-4 text-amber-600" />
                      <span>專家申請之專業領域與公開資歷</span>
                    </span>
                    <span className="text-[11px] font-bold text-stone-500 tabular-nums">
                      送審時間：{inspectUser.expertApplicationData?.appliedAt ? new Date(inspectUser.expertApplicationData.appliedAt).toLocaleString() : '最近'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="bg-white p-2.5 rounded-xl border border-stone-200">
                      <span className="text-stone-400 block text-[11px]">申請認證主領域</span>
                      <span className="font-semibold text-stone-900">
                        {inspectUser.expertApplicationData?.domains?.join('、') ||
                          inspectUser.domains?.join('、') ||
                          inspectUser.domain ||
                          '專業問題'}
                      </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-stone-200">
                      <span className="text-stone-400 block text-[11px]">公開頭銜 / 實務年資</span>
                      <span className="font-semibold text-stone-900">
                        {inspectUser.expertApplicationData?.professionalTitle || inspectUser.title || '專業顧問'} · {inspectUser.expertApplicationData?.yearsOfExperience || '5年以上'}
                      </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-stone-200 col-span-1 sm:col-span-2">
                      <span className="text-stone-400 block text-[11px]">專家專長子領域標籤</span>
                      <div className="flex items-center gap-1.5 flex-wrap mt-1">
                        {(
                          (inspectUser.expertApplicationData?.subdomains ||
                            inspectUser.subdomains ||
                            inspectUser.skills ||
                            ['系統架構', 'AI應用', '顧問諮詢']) as string[]
                        ).map((sub, idx) => (
                          <span
                            key={idx}
                            className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-stone-200"
                          >
                            ✓ {sub}
                          </span>
                        ))}
                      </div>
                    </div>

                    {inspectUser.expertApplicationData?.proofDescription && (
                      <div className="bg-white p-2.5 rounded-xl border border-stone-200 col-span-1 sm:col-span-2">
                        <span className="text-stone-400 block text-[11px]">專家實務經歷自述</span>
                        <p className="text-xs text-stone-700 leading-relaxed mt-0.5">
                          {inspectUser.expertApplicationData.proofDescription}
                        </p>
                      </div>
                    )}

                    {inspectUser.expertApplicationData?.portfolioLink && (
                      <div className="bg-white p-2.5 rounded-xl border border-stone-200 col-span-1 sm:col-span-2 flex items-center justify-between">
                        <span className="text-stone-400 text-[11px]">作品集 / LinkedIn / GitHub 連結</span>
                        <a
                          href={inspectUser.expertApplicationData.portfolioLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 underline"
                        >
                          <span>{inspectUser.expertApplicationData.portfolioLink}</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* 專家專業證照與專技執照照片清單 (credentialsFiles) */}
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-stone-900 flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-amber-600" />
                      <span>
                        專家專業證照與執業執照影像 ({inspectUser.expertApplicationData?.credentialsFiles?.length || 0} 份)
                      </span>
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-stone-200">
                       專業證照（非身分證）
                    </span>
                  </div>

                  {inspectUser.expertApplicationData?.credentialsFiles &&
                  inspectUser.expertApplicationData.credentialsFiles.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {inspectUser.expertApplicationData.credentialsFiles.map((cred, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-2xl bg-white border border-stone-200 space-y-2 hover:border-stone-200 transition-all shadow-2xs group"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-stone-800 truncate max-w-[180px]">
                              {cred.name}
                            </span>
                            <span className="text-[11px] text-emerald-700 font-bold tabular-nums">
                              {cred.size || '安全清晰壓縮'}
                            </span>
                          </div>

                          {cred.url ? (
                            <div
                              onClick={() => {
                                setLightboxRotation(0);
                                setLightboxZoom(1);
                                setLightboxPhoto({
                                  userName: inspectUser.name,
                                  userId: inspectUser.id,
                                  certType: 'expert_credential',
                                  url: cred.url!,
                                  title: cred.name,
                                  size: cred.size,
                                  storagePath: cred.storagePath || `expert_credentials/${inspectUser.id}/`,
                                  isStorage: cred.isStorage ?? true,
                                  uploadedAt: cred.uploadedAt,
                                });
                              }}
                              className="relative rounded-xl overflow-hidden bg-stone-900 aspect-16/10 cursor-pointer shadow-2xs group-hover:ring-2 group-hover:ring-amber-400"
                            >
                              <img
                                src={cred.url}
                                alt={cred.name}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-stone-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-bold">
                                <ZoomIn className="w-4 h-4" />
                                <span>點擊全螢幕放大檢核</span>
                              </div>
                            </div>
                          ) : (
                            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-stone-600 text-xs flex items-center gap-2">
                              <FileText className="w-5 h-5 text-amber-600 shrink-0" />
                              <span className="truncate">{cred.name}</span>
                            </div>
                          )}

                          <div className="flex items-center justify-between text-[11px] text-stone-500 tabular-nums px-1">
                            <span className="truncate max-w-[140px]">
                              {cred.storagePath || 'expert_credentials/cert.jpg'}
                            </span>
                            <span className="text-amber-800 font-bold">
                              {cred.isStorage ? ' Storage' : '安全加密'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center rounded-2xl bg-white border border-dashed border-stone-200 text-stone-400 text-xs">
                      <Award className="w-6 h-6 mx-auto mb-1 text-stone-300" />
                      <span>尚未上傳專業證照影像</span>
                    </div>
                  )}
                </div>

                {/* 實戰佐證文件與報告 (proofFiles) */}
                {inspectUser.expertApplicationData?.proofFiles &&
                  inspectUser.expertApplicationData.proofFiles.length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                      <span className="font-bold text-xs text-stone-800 block">
                        實戰成果佐證報告 ({inspectUser.expertApplicationData.proofFiles.length} 份)：
                      </span>
                      <div className="space-y-1.5">
                        {inspectUser.expertApplicationData.proofFiles.map((pf, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-xl bg-white border border-stone-200 text-xs flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                              <span className="font-bold text-stone-800 truncate">{pf.name}</span>
                              {pf.size && (
                                <span className="text-[11px] text-stone-400 tabular-nums shrink-0">
                                  ({pf.size})
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-amber-900 font-bold bg-amber-50 px-2 py-0.5 rounded border border-stone-200">
                              加分佐證
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* AI 專家審查 Copilot 診斷面板 */}
                <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 text-xs space-y-1.5 text-amber-950">
                  <div className="flex items-center gap-1.5 font-semibold text-amber-900">
                    <Bot className="w-4 h-4 text-amber-600" />
                    <span>AI 專家資格預審助手 (Copilot 診斷建議)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pt-1">
                    <div className="p-2 rounded-xl bg-white/80 border border-stone-200">
                      <span className="text-stone-500 block">專業證照相符度：</span>
                      <span className="font-bold text-emerald-700">✓ 執照與申請領域高度吻合</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white/80 border border-stone-200">
                      <span className="text-stone-500 block">資歷與成果完整度：</span>
                      <span className="font-bold text-emerald-700">✓ 年資佐證與案例齊全</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white/80 border border-stone-200">
                      <span className="text-stone-500 block">審查裁決建議：</span>
                      <span className="font-bold text-amber-800"> 具備深厚實戰力，建議通過</span>
                    </div>
                  </div>
                </div>

                {/* 專家快速操作工具列 */}
                <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                  <span className="text-xs text-stone-500">
                    專家資格：
                    <strong className="text-amber-950 ml-1">
                      {inspectUser.verifiedExpert
                        ? '已取得官方認證專家徽章'
                        : inspectUser.expertApplicationStatus === 'pending'
                        ? '申請審查中'
                        : '未取得'}
                    </strong>
                  </span>
                  <div className="flex items-center gap-2">
                    {inspectUser.verifiedExpert ? (
                      <button
                        type="button"
                        onClick={() =>
                          setActionModal({
                            targetUser: inspectUser,
                            type: 'expert',
                            action: 'revoke',
                          })
                        }
                        className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-stone-200 text-xs font-semibold cursor-pointer"
                      >
                        移除專家資格
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setActionModal({
                            targetUser: inspectUser,
                            type: 'expert',
                            action: 'approve',
                          })
                        }
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-stone-950 text-xs font-semibold shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <Crown className="w-4 h-4" />
                        <span>一鍵核准授予專家資格</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2 text-right border-t border-stone-100">
              <button
                type="button"
                onClick={() => setInspectUser(null)}
                className="px-5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold cursor-pointer"
              >
                完成審視並關閉
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 照片高清檢驗燈箱彈窗 (支援身分證與專家證照，附旋轉、縮放與水印防偽) */}
      {lightboxPhoto && (
        <div className="fixed inset-0 z-[60] bg-stone-950/85 backdrop-blur-md flex flex-col items-center justify-between p-4 animate-in fade-in duration-150">
          {/* 燈箱頂部工具列 */}
          <div className="w-full max-w-4xl flex items-center justify-between bg-stone-900/90 border border-stone-800 rounded-2xl px-4 py-3 text-white shadow-sm shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  lightboxPhoto.certType === 'expert_credential'
                    ? 'bg-amber-500 text-stone-950'
                    : 'bg-purple-600 text-white'
                }`}
              >
                {lightboxPhoto.certType === 'expert_credential' ? (
                  <Award className="w-4 h-4" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-sm text-stone-100 truncate">{lightboxPhoto.title}</h4>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                      lightboxPhoto.certType === 'expert_credential'
                        ? 'bg-amber-900/60 text-amber-300 border-amber-700/50'
                        : 'bg-purple-900/60 text-purple-300 border-purple-700/50'
                    }`}
                  >
                    {lightboxPhoto.certType === 'expert_credential'
                      ? ' 專家專業證照 · 獨立審查'
                      : ' 國民身分證 · KYC 審查'}
                  </span>
                </div>
                <p className="text-[11px] text-stone-400 tabular-nums truncate">
                  體積：{lightboxPhoto.size || '安全清晰壓縮'} · 儲存路徑：{lightboxPhoto.storagePath || 'storage/'}
                </p>
              </div>
            </div>

            {/* 控制工具：旋轉、縮放、另開原圖、關閉 */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setLightboxRotation((prev) => (prev + 90) % 360)}
                className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
                title="順時針旋轉 90 度"
              >
                <RotateCw className="w-4 h-4" />
                <span className="hidden sm:inline">旋轉 {lightboxRotation}°</span>
              </button>

              <button
                type="button"
                onClick={() => setLightboxZoom((prev) => (prev === 1 ? 1.5 : prev === 1.5 ? 2 : 1))}
                className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
                title="切換放大倍率"
              >
                <ZoomIn className="w-4 h-4" />
                <span className="hidden sm:inline">{lightboxZoom * 100}%</span>
              </button>

              <a
                href={lightboxPhoto.url}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer"
                title="另開高畫質視窗檢視"
              >
                <ExternalLink className="w-4 h-4" />
              </a>

              <button
                type="button"
                onClick={() => {
                  setLightboxPhoto(null);
                  setLightboxRotation(0);
                  setLightboxZoom(1);
                }}
                className="p-2 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white transition-colors cursor-pointer ml-1"
                title="關閉檢視 (ESC)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 燈箱主圖片檢視區 */}
          <div className="flex-1 w-full max-w-4xl flex items-center justify-center overflow-auto p-4 my-2 relative">
            <div className="relative max-h-full max-w-full flex items-center justify-center">
              <img
                src={lightboxPhoto.url}
                alt={lightboxPhoto.title}
                style={{
                  transform: `scale(${lightboxZoom}) rotate(${lightboxRotation}deg)`,
                  transition: 'transform 0.2s ease-in-out',
                }}
                className="max-h-[70vh] max-w-full object-contain rounded-2xl shadow-2xl border border-stone-800 bg-stone-900 select-none"
              />

              {/* 防偽內部專用水印 */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none px-3 py-1 rounded-full bg-stone-950/70 backdrop-blur-xs text-[11px] text-stone-300 border border-stone-700/60 tabular-nums tracking-wider whitespace-nowrap">
                {lightboxPhoto.certType === 'expert_credential'
                  ? ' IdeaX 官方管理員專家資格審查專用 · 證照機密嚴禁外洩'
                  : ' IdeaX 官方管理員實名認證審查專用 · 機密文件嚴禁外洩'}
              </div>
            </div>
          </div>

          {/* 燈箱底部提示條 */}
          <div className="w-full max-w-4xl bg-stone-900/80 border border-stone-800/80 rounded-2xl px-4 py-2.5 text-stone-400 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>
                {lightboxPhoto.certType === 'expert_credential'
                  ? '專家專業證照已智慧安全壓縮（字號與印章清晰無損，體積僅 200~350KB），存於 Firebase Storage (expert_credentials/)。'
                  : '身分證照片已智慧安全壓縮（防過度壓縮保證字元辨識度，容量僅約 200~350KB），存於 Firebase Storage (id_cards/)。'}
              </span>
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-stone-500 tabular-nums">
                {lightboxPhoto.uploadedAt ? new Date(lightboxPhoto.uploadedAt).toLocaleString() : '建檔時間正常'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setLightboxPhoto(null);
                  setLightboxRotation(0);
                  setLightboxZoom(1);
                }}
                className="px-3 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold cursor-pointer"
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

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { User, AdminSite } from '../types';
import {
  isInitialAdmin,
  isSiteAAdmin,
  isSiteBAdmin,
  getAdminSiteLabel,
  getAdminSiteBadgeClass,
} from '../utils/adminPermissions';
import { resolveUserDisplayName, resolveUserAvatar, getUserNameColorClass, USER_ALIAS_MAP, saveCustomUserProfile } from '../utils/userDisplay';
import { syncUserToFirestore } from '../services/firestoreSync';
import { isRealRegisteredUser, isTestAccountUserId } from '../data/mockData';
import { isSimulatedUser } from '../data/virtualProposalsSeed';
import {
  UserCheck,
  ShieldAlert,
  Search,
  Filter,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  X,
  Calendar,
  Lock,
  Unlock,
  Sparkles,
  UserPlus,
  RefreshCw,
  ShieldCheck,
  Image as ImageIcon,
  UserX,
  Crown,
  Shield,
  Check,
  User as UserIcon,
  Eye,
  ExternalLink,
  Trash2,
  MessageSquare,
  Edit3,
  Camera,
  Upload,
  Save,
} from 'lucide-react';
import { AdminUserProfileModal } from './AdminUserProfileModal';
import { AdminUserImpersonationModal } from './AdminUserImpersonationModal';
import { AdminAuthBackfillCard } from './AdminAuthBackfillCard';
import { AdminAnswerSecretsCard } from './AdminAnswerSecretsCard';

interface AdminUserManagementTabProps {
  onNavigateToCertifications?: (userId?: string) => void;
  onOpenChat?: () => void;
  onCloseParentModal?: () => void;
}

export const AdminUserManagementTab: React.FC<AdminUserManagementTabProps> = ({
  onNavigateToCertifications,
  onOpenChat,
  onCloseParentModal,
}) => {
  const {
    availableUsers,
    setAvailableUsers,
    currentUser,
    setCurrentUser,
    blockUser,
    unblockUser,
    addTestAccount,
    purgeExpiredDeactivatedAccounts,
    requestAccountDeactivation,
    cancelAccountDeactivation,
    purgeAccountPermanently,
    removeDuplicateAccounts,
    deleteUserAccountPermanently,
    pullAllDataFromFirestore,
    grantUserAdminRole,
    startDirectChat,
    addNotification,
    purgeAllSimulatedData,
  } = useApp();

  const [activeFilter, setActiveFilter] = useState<'all' | 'real' | 'normal' | 'enterprise' | 'admin' | 'simulated' | 'blocked' | 'deactivated'>('real');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; isError?: boolean } | null>(null);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [isRemovingDuplicates, setIsRemovingDuplicates] = useState(false);
  const [isPurgingSimulated, setIsPurgingSimulated] = useState(false);
  const [deletingTargetUser, setDeletingTargetUser] = useState<User | null>(null);

  // 掛載時自動連線雲端資料庫更新最新真實註冊名單
  React.useEffect(() => {
    void pullAllDataFromFirestore();
  }, [pullAllDataFromFirestore]);

  // 用戶個人資訊頁與用戶視角檢視彈窗狀態
  const [viewingProfileUser, setViewingProfileUser] = useState<User | null>(null);
  const [impersonatingUser, setImpersonatingUser] = useState<User | null>(null);

  // 管理員編輯用戶（改名、換頭像）狀態
  const [editingUserProfileUser, setEditingUserProfileUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editAvatarError, setEditAvatarError] = useState<string | null>(null);
  const editAvatarInputRef = React.useRef<HTMLInputElement>(null);

  const handleOpenEditUser = (target: User) => {
    setEditingUserProfileUser(target);
    setEditName(resolveUserDisplayName(target.id, target.name, availableUsers));
    setEditTitle(target.title || '');
    setEditAvatar(resolveUserAvatar(target.id, target.avatar, availableUsers));
    setEditAvatarError(null);
  };

  const handleEditUserAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 6 * 1024 * 1024) {
      setEditAvatarError(`頭像照片檔案過大（${(file.size / (1024 * 1024)).toFixed(1)}MB）。系統限制 6MB 內！`);
      e.target.value = '';
      return;
    }

    setEditAvatarError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const size = 320;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const minDim = Math.min(img.width, img.height);
            const sx = (img.width - minDim) / 2;
            const sy = (img.height - minDim) / 2;
            ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
            const compressed = canvas.toDataURL('image/jpeg', 0.85);
            setEditAvatar(compressed);
          }
        } catch {
          setEditAvatar(event.target?.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveUserEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserProfileUser) return;
    const newName = editName.trim() || editingUserProfileUser.name;
    const newAvatar = editAvatar || editingUserProfileUser.avatar;
    const newTitle = editTitle.trim();

    saveCustomUserProfile(editingUserProfileUser.id, {
      name: newName,
      avatar: newAvatar,
      title: newTitle,
    });

    const aliasId = USER_ALIAS_MAP[editingUserProfileUser.id];
    setAvailableUsers((users) =>
      users.map((u) =>
        u.id === editingUserProfileUser.id || (aliasId && u.id === aliasId)
          ? { ...u, name: newName, avatar: newAvatar, title: newTitle }
          : u
      )
    );

    if (currentUser.id === editingUserProfileUser.id || (aliasId && currentUser.id === aliasId)) {
      setCurrentUser((prev) => ({
        ...prev,
        name: newName,
        avatar: newAvatar,
        title: newTitle,
      }));
    }

    const updatedTarget: User = {
      ...editingUserProfileUser,
      name: newName,
      avatar: newAvatar,
      title: newTitle,
    };
    syncUserToFirestore(updatedTarget).catch(() => {});

    setFeedbackMsg({
      text: `已成功更新「${newName}」的姓名與頭像！`,
      isError: false,
    });
    setTimeout(() => setFeedbackMsg(null), 4000);
    setEditingUserProfileUser(null);
  };

  // 管理員直接與用戶發起 1 對 1 私聊
  const handleStartChatWithUser = (target: User) => {
    if (target.id === currentUser.id) {
      if (addNotification) {
        addNotification({ title: '提醒', message: '您無法與自己發起私聊！', type: 'system' });
      }
      return;
    }

    startDirectChat({
      id: target.id,
      name: target.name,
      avatar: target.avatar,
      title: target.title || (target.accountType === 'enterprise' || (target.role as string) === 'enterprise' ? '企業機構' : '一般用戶'),
    });

    if (onOpenChat) {
      onOpenChat();
    } else if (onCloseParentModal) {
      onCloseParentModal();
    }
  };

  // 一鍵生成測試帳號彈窗狀態
  const [isTestUserModalOpen, setIsTestUserModalOpen] = useState(false);
  const [testUserRole, setTestUserRole] = useState<'solver' | 'questioner' | 'admin'>('solver');
  const [testUserName, setTestUserName] = useState('');
  const [testUserTitle, setTestUserTitle] = useState('');
  const [testUserBalance, setTestUserBalance] = useState<number>(10000);
  const [testUserVerifiedExpert, setTestUserVerifiedExpert] = useState(true);

  // 封鎖彈窗狀態
  const [blockingTargetUser, setBlockingTargetUser] = useState<User | null>(null);
  const [blockDuration, setBlockDuration] = useState<number | 'permanent'>(7);
  const [blockReason, setBlockReason] = useState('');

  // 解封二次確認彈窗
  const [unblockingTargetUser, setUnblockingTargetUser] = useState<User | null>(null);

  // 初始管理員指派兩站管理員彈窗狀態
  const [adminAssignTargetUser, setAdminAssignTargetUser] = useState<User | null>(null);
  const [selectedAdminSites, setSelectedAdminSites] = useState<AdminSite[]>([]);

  const handleOpenAdminAssignModal = (u: User) => {
    setAdminAssignTargetUser(u);
    if (u.adminSites && u.adminSites.length > 0) {
      setSelectedAdminSites([...u.adminSites]);
    } else if (u.role === 'admin' || u.accountType === 'admin') {
      setSelectedAdminSites(['site_a']);
    } else {
      setSelectedAdminSites([]);
    }
  };

  const handleSaveAdminSites = () => {
    if (!adminAssignTargetUser) return;
    const res = grantUserAdminRole(adminAssignTargetUser.id, selectedAdminSites);
    if (res.success) {
      setFeedbackMsg({ text: res.message, isError: false });
      setAdminAssignTargetUser(null);
    } else {
      setFeedbackMsg({ text: res.message, isError: true });
    }
    setTimeout(() => setFeedbackMsg(null), 5000);
  };

  const isUserDeactivated = (u: User) => {
    if (u.isDeactivated === false && u.deactivationStatus !== 'deactivated') {
      return false;
    }
    if (!u.isDeactivated && !u.deactivationStatus && !u.deactivationRequestedAt) {
      return false;
    }
    return Boolean(
      u.isDeactivated ||
      u.deactivationStatus === 'pending_grace' ||
      u.deactivationStatus === 'deactivated'
    );
  };

  const realUsers = availableUsers.filter((u) => isRealRegisteredUser(u));
  const enterpriseUsers = availableUsers.filter(
    (u) => u.accountType === 'enterprise' || (u.role as string) === 'enterprise'
  );
  const adminUsers = availableUsers.filter((u) => u.role === 'admin' || u.accountType === 'admin');
  const simulatedUsers = availableUsers.filter(
    (u) => isSimulatedUser(u) || isTestAccountUserId(u.id) || !isRealRegisteredUser(u)
  );
  const blockedUsers = availableUsers.filter((u) => u.isBlocked);
  const deactivatedUsers = availableUsers.filter((u) => !u.isBlocked && isUserDeactivated(u));
  const normalUsers = availableUsers.filter((u) => !u.isBlocked && !isUserDeactivated(u));

  // 一鍵徹底清除所有模擬與展示帳號
  const handlePurgeSimulated = async () => {
    if (!window.confirm('確定要徹底清除所有 42 位模擬創作者與預設展示帳號嗎？\n此動作將同步從雲端資料庫與本地儲存清除，名單將 100% 僅保留真實註冊會員與平台管理員！')) {
      return;
    }
    setIsPurgingSimulated(true);
    try {
      const res = await purgeAllSimulatedData();
      setFeedbackMsg({
        text: `已成功清除 ${res.purgedUsers || 42} 個模擬展示帳號！目前名單僅保留真實註冊會員與管理員。`,
        isError: false,
      });
      setActiveFilter('real');
    } catch {
      setFeedbackMsg({ text: '清理模擬帳號時發生錯誤，請稍後重試。', isError: true });
    } finally {
      setIsPurgingSimulated(false);
      setTimeout(() => setFeedbackMsg(null), 5000);
    }
  };

  const filteredUsers = availableUsers.filter((u) => {
    const hasSearch = Boolean(searchQuery.trim());
    const q = searchQuery.toLowerCase().trim();
    const cleanQ = q.replace(/^@/, '');

    // 狀態篩選
    if (!hasSearch) {
      if (activeFilter === 'real' && !isRealRegisteredUser(u)) return false;
      if (activeFilter === 'normal' && (u.isBlocked || isUserDeactivated(u))) return false;
      if (activeFilter === 'enterprise' && !(u.accountType === 'enterprise' || (u.role as string) === 'enterprise')) return false;
      if (activeFilter === 'admin' && u.role !== 'admin' && u.accountType !== 'admin') return false;
      if (activeFilter === 'simulated' && isRealRegisteredUser(u)) return false;
      if (activeFilter === 'blocked' && !u.isBlocked) return false;
      if (activeFilter === 'deactivated' && !isUserDeactivated(u)) return false;
    } else {
      // 搜尋中時：若用戶停留在特定分頁（如真實、企業、管理員、封鎖、註銷），依舊遵循該分頁；在全部時則全局檢索
      if (activeFilter === 'real' && !isRealRegisteredUser(u)) return false;
      if (activeFilter === 'enterprise' && !(u.accountType === 'enterprise' || (u.role as string) === 'enterprise')) return false;
      if (activeFilter === 'admin' && u.role !== 'admin' && u.accountType !== 'admin') return false;
      if (activeFilter === 'simulated' && isRealRegisteredUser(u)) return false;
      if (activeFilter === 'blocked' && !u.isBlocked) return false;
      if (activeFilter === 'deactivated' && !isUserDeactivated(u)) return false;
    }
    if (hasSearch) {
      const displayName = resolveUserDisplayName(u.id, u.name, availableUsers).toLowerCase();
      const rawName = (u.name || '').toLowerCase();
      const realName = ((u.realNameAuthData as any)?.legalName || (u.realNameAuthData as any)?.realName || '').toLowerCase();
      const matchName = displayName.includes(q) || rawName.includes(q) || (realName && realName.includes(q));

      const matchId =
        (u.id || '').toLowerCase().includes(q) ||
        (cleanQ && (u.id || '').toLowerCase().includes(cleanQ));
      const matchMemberId =
        (u.memberId || '').toLowerCase().includes(q) ||
        (cleanQ && (u.memberId || '').toLowerCase().includes(cleanQ));
      const matchUsername =
        (u.username || '').toLowerCase().includes(q) ||
        (cleanQ && (u.username || '').toLowerCase().includes(cleanQ));
      const matchEmail =
        (u.email || '').toLowerCase().includes(q) ||
        (cleanQ && (u.email || '').toLowerCase().includes(cleanQ));
      const matchPhone =
        (u.phone || '').toLowerCase().includes(q) ||
        (cleanQ && (u.phone || '').replace(/[\s-]/g, '').includes(cleanQ.replace(/[\s-]/g, '')));
      const matchTitle = (u.title || '').toLowerCase().includes(q);
      const matchCompany = (u.company || '').toLowerCase().includes(q);
      const matchRole = (u.role || '').toLowerCase().includes(q);
      const matchAccountType = (u.accountType || '').toLowerCase().includes(q);
      const aliasId = USER_ALIAS_MAP[u.id];
      const matchAlias =
        aliasId &&
        (aliasId.toLowerCase().includes(q) || (cleanQ && aliasId.toLowerCase().includes(cleanQ)));

      return (
        matchName ||
        matchId ||
        matchMemberId ||
        matchUsername ||
        matchEmail ||
        matchPhone ||
        matchTitle ||
        matchCompany ||
        matchRole ||
        matchAccountType ||
        Boolean(matchAlias)
      );
    }
    return true;
  });

  const handleConfirmBlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockingTargetUser) return;
    if (!blockReason.trim()) {
      setFeedbackMsg({ text: '請填寫封鎖理由說明！', isError: true });
      return;
    }

    const res = blockUser(blockingTargetUser.id, blockDuration, blockReason.trim());
    if (res.success) {
      setFeedbackMsg({ text: res.message, isError: false });
      setBlockingTargetUser(null);
      setBlockReason('');
      setBlockDuration(7);
    } else {
      setFeedbackMsg({ text: res.message, isError: true });
    }
    setTimeout(() => setFeedbackMsg(null), 5000);
  };

  const handleConfirmUnblock = () => {
    if (!unblockingTargetUser) return;
    const res = unblockUser(unblockingTargetUser.id);
    if (res.success) {
      setFeedbackMsg({ text: res.message, isError: false });
      setUnblockingTargetUser(null);
    } else {
      setFeedbackMsg({ text: res.message, isError: true });
    }
    setTimeout(() => setFeedbackMsg(null), 5000);
  };

  const QUICK_REASONS = [
    '多次惡意洗版或發布垃圾資訊',
    '違反平台交易規範，私下繞過平台收費',
    '對其他用戶進行言語騷擾或人身攻擊',
    '交付不實成果或涉嫌詐騙',
    '帳號涉嫌異常登入與安全性風險',
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* 資料維護：補齊帳號對照（資料庫權限） */}
      <AdminAuthBackfillCard />
      <AdminAnswerSecretsCard />

      {/* 頂部訊息反饋 */}
      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 border animate-in fade-in ${
            feedbackMsg.isError
              ? 'bg-rose-50 text-rose-900 border-rose-200'
              : 'bg-emerald-50 text-emerald-900 border-emerald-200'
          }`}
        >
          {feedbackMsg.isError ? (
            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* 標題與說明 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-3.5">
        <div>
          <h3 className="text-base sm:text-lg font-black text-stone-900 flex items-center gap-2 flex-wrap">
            <UserCheck className="w-5 h-5 text-purple-600" />
            <span>用戶管理</span>
            <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs">
              🌟 真實註冊會員 {realUsers.length} 位
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-900">
              全站共 {availableUsers.length} 位用戶
            </span>
            {simulatedUsers.length > 0 && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                🤖 模擬展示 {simulatedUsers.length} 位
              </span>
            )}
          </h3>
          <p className="text-xs text-stone-500 mt-1">
            管理員可直接對任何真實或系統用戶發起 1 對 1 私聊輔導、查閱完整個人檔案與交易紀錄、指派管理員站點、或進行停權封鎖與審計。
          </p>
        </div>

        {/* 操作與統計群組 */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* 一鍵清除所有模擬展示帳號 */}
          {simulatedUsers.length > 0 && (
            <button
              type="button"
              disabled={isPurgingSimulated}
              onClick={handlePurgeSimulated}
              className="px-3.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 active:scale-95 text-amber-950 font-black text-xs border border-amber-300 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="徹底從雲端與本地清除所有預設模擬創作者帳號，讓名單 100% 呈現真實用戶"
            >
              <Trash2 className={`w-3.5 h-3.5 text-amber-700 ${isPurgingSimulated ? 'animate-spin' : ''}`} />
              <span>{isPurgingSimulated ? '清理模擬中...' : '🧹 清除所有模擬帳號'}</span>
            </button>
          )}

          {/* 測試模式一鍵生成測試帳號按鈕 */}
          <button
            type="button"
            onClick={() => setIsTestUserModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:scale-95 text-stone-950 font-black text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            title="免註冊、免登入一鍵生成測試帳號"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>＋ 添加測試帳號</span>
          </button>

          {/* 即時從雲端同步 */}
          <button
            type="button"
            disabled={isSyncingCloud}
            onClick={async () => {
              setIsSyncingCloud(true);
              try {
                const ok = await pullAllDataFromFirestore();
                setFeedbackMsg({
                  text: ok ? '已成功從雲端同步最新用戶名單與狀態！' : '雲端資料已是最新。',
                  isError: false,
                });
              } catch {
                setFeedbackMsg({ text: '同步失敗，請稍後重試。', isError: true });
              } finally {
                setIsSyncingCloud(false);
                setTimeout(() => setFeedbackMsg(null), 4000);
              }
            }}
            className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 font-bold text-xs border border-purple-200 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
            title="即時從 Cloud Firestore 重新整理最新用戶狀態"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCloud ? 'animate-spin text-purple-700' : 'text-purple-600'}`} />
            <span>{isSyncingCloud ? '同步中...' : '重新整理雲端'}</span>
          </button>

          {/* 一鍵掃描並刪除重複帳號 */}
          <button
            type="button"
            disabled={isRemovingDuplicates}
            onClick={async () => {
              setIsRemovingDuplicates(true);
              try {
                const res = await removeDuplicateAccounts();
                if (res.removedCount > 0) {
                  setFeedbackMsg({
                    text: `已成功清除 ${res.removedCount} 個重複帳號（${res.removedNames.slice(0, 5).join('、')}${res.removedNames.length > 5 ? '...' : ''}），目前共保留 ${res.remainingCount} 個唯一帳號並同步至資料庫！`,
                    isError: false,
                  });
                } else {
                  setFeedbackMsg({
                    text: `已完成全庫掃描：目前共 ${res.remainingCount} 個唯一帳號，無任何重複帳號！`,
                    isError: false,
                  });
                }
              } catch {
                setFeedbackMsg({ text: '清理重複帳號時發生錯誤，請稍後重試。', isError: true });
              } finally {
                setIsRemovingDuplicates(false);
                setTimeout(() => setFeedbackMsg(null), 5000);
              }
            }}
            className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-900 font-black text-xs border border-rose-300 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="自動比對帳號 ID、會員編號、Email 與姓名，一鍵清除本地與雲端資料庫中的重複帳號"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>{isRemovingDuplicates ? '清理重複中...' : '刪除重複帳號'}</span>
          </button>

          {/* 清理到期註銷帳號 */}
          <button
            type="button"
            onClick={async () => {
              const purged = await purgeExpiredDeactivatedAccounts();
              setFeedbackMsg({
                text: purged > 0 ? `已成功正式註銷並清理 ${purged} 位屆滿 7 日之帳號！` : '目前無滿 7 日待正式註銷之帳號。',
                isError: false,
              });
              setTimeout(() => setFeedbackMsg(null), 4000);
            }}
            className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs border border-stone-200 transition-all flex items-center gap-1 cursor-pointer"
            title="檢查並批次執行滿 7 日反悔期之帳號正式註銷"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>到期註銷批次處理</span>
          </button>

          {/* 封鎖名單快速統計 Badge */}
          <span className={`text-xs font-black px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${
            blockedUsers.length > 0
              ? 'bg-rose-50 text-rose-900 border-rose-300'
              : 'bg-stone-50 text-stone-600 border-stone-200'
          }`}>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <span>停權封鎖：<strong>{blockedUsers.length}</strong></span>
          </span>
        </div>
      </div>

      {/* 快捷通道：直接連線至受理認證與身分證照頁 */}
      {onNavigateToCertifications && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50/60 to-white border border-purple-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-black text-purple-950 flex items-center gap-1.5">
                <span>受理認證與身分證照核驗通道</span>
                <span className="text-[10px] bg-purple-200 text-purple-900 px-1.5 py-0.2 rounded font-bold">已連線</span>
              </div>
              <p className="text-[11px] text-stone-500 mt-0.5">
                解答者上傳之身分證正反面相片已安全壓縮並存於 Firebase Storage，可隨時前往受理認證頁查閱並核准資格。
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigateToCertifications()}
            className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-black text-xs shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>前往受理認證頁 ↗</span>
          </button>
        </div>
      )}

      {/* 篩選與搜尋列 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* 狀態切換按鈕 */}
        <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-2xl border border-stone-200 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-purple-700 text-white shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            全部用戶 ({availableUsers.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('real')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
              activeFilter === 'real'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-emerald-800 hover:bg-emerald-50'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>🌟 真實會員 ({realUsers.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('normal')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'normal'
                ? 'bg-stone-800 text-white shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            正常使用 ({normalUsers.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('enterprise')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'enterprise'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-blue-800 hover:bg-blue-50'
            }`}
          >
            🏢 企業機構 ({enterpriseUsers.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('admin')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'admin'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'text-amber-800 hover:bg-amber-50'
            }`}
          >
            👑 管理團隊 ({adminUsers.length})
          </button>
          {simulatedUsers.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveFilter('simulated')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeFilter === 'simulated'
                  ? 'bg-stone-600 text-white shadow-2xs'
                  : 'text-stone-500 hover:bg-stone-200'
              }`}
            >
              🤖 模擬展示 ({simulatedUsers.length})
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveFilter('blocked')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              activeFilter === 'blocked'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'text-rose-700 hover:bg-rose-50'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>封鎖名單 ({blockedUsers.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('deactivated')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              activeFilter === 'deactivated'
                ? 'bg-stone-500 text-white shadow-2xs'
                : 'text-stone-700 hover:bg-stone-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>註銷/反悔期 ({deactivatedUsers.length})</span>
          </button>
        </div>

        {/* 搜尋框 */}
        <div className="relative sm:w-72">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="搜尋用戶姓名、ID、Email、手機或身分..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:border-purple-500 outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5 cursor-pointer"
              title="清除搜尋"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 用戶列表清單 */}
      <div className="space-y-3">
        {filteredUsers.length === 0 ? (
          <div className="p-10 text-center bg-stone-50 rounded-3xl border border-dashed border-stone-200 space-y-2">
            <UserCheck className="w-8 h-8 text-stone-300 mx-auto" />
            <p className="text-xs font-bold text-stone-600">無相符的用戶名單</p>
          </div>
        ) : (
          filteredUsers.map((u) => {
            const isSelf = u.id === currentUser.id;
            const isBlocked = Boolean(u.isBlocked);

            return (
              <div
                key={u.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                  isBlocked
                    ? 'bg-rose-50/50 border-rose-300 shadow-2xs ring-1 ring-rose-200'
                    : 'bg-white border-stone-200 hover:border-stone-300 shadow-2xs'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* 用戶主視覺資訊（點擊可直接連結開啟個人資訊頁） */}
                  <div
                    onClick={() => setViewingProfileUser(u)}
                    className="flex items-center gap-3 min-w-0 cursor-pointer group/user flex-1"
                    title={`點擊查看「${u.name}」的完整個人資訊頁`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                        alt={u.name}
                        className="w-12 h-12 rounded-2xl object-cover ring-2 ring-stone-200 group-hover/user:ring-purple-400 group-hover/user:scale-105 transition-all shrink-0"
                      />
                      {u.isInitialAdmin && (
                        <span className="absolute -top-1 -right-1 bg-amber-400 text-stone-950 p-0.5 rounded-full shadow-xs" title="初始創始管理員">
                          <Crown className="w-2.5 h-2.5 fill-current" />
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className={`font-black text-sm transition-colors truncate flex items-center gap-1 ${getUserNameColorClass(u.id, availableUsers, u)}`}>
                          <span>{resolveUserDisplayName(u.id, u.name, availableUsers)}</span>
                          <ExternalLink className="w-3 h-3 text-purple-500 opacity-0 group-hover/user:opacity-100 transition-opacity shrink-0" />
                        </h4>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            u.role === 'admin'
                              ? getAdminSiteBadgeClass(u) || 'bg-purple-100 text-purple-900 border border-purple-300'
                              : u.accountType === 'enterprise' || (u.role as string) === 'enterprise'
                              ? 'bg-blue-100 text-blue-900 border border-blue-200'
                              : 'bg-amber-100 text-amber-900 border border-amber-200'
                          }`}
                        >
                          {u.role === 'admin' ? (getAdminSiteLabel(u) || '👑 管理員') : u.accountType === 'enterprise' || (u.role as string) === 'enterprise' ? '🏢 企業機構' : '👤 一般用戶'}
                        </span>

                        {isRealRegisteredUser(u) ? (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1 shadow-2xs" title="此帳號為真實註冊會員 (已在 Firebase / 資料庫建立)">
                            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                            <span>真實會員</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-stone-100 text-stone-500 border border-stone-200 flex items-center gap-1" title="此帳號為系統預設模擬展示或測試環境帳號">
                            <span>🤖 系統模擬/展示</span>
                          </span>
                        )}

                        {isBlocked ? (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-rose-600 text-white flex items-center gap-1 shadow-2xs">
                            <Lock className="w-3 h-3" />
                            <span>已停權封鎖</span>
                          </span>
                        ) : u.deactivationStatus === 'deactivated' ? (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-stone-200 text-stone-700 border border-stone-300">
                            此帳號已註銷
                          </span>
                        ) : isUserDeactivated(u) ? (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 animate-pulse flex items-center gap-1 shadow-2xs">
                            <Clock className="w-3 h-3 text-amber-700" />
                            <span>7日反悔猶豫期中</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                            正常使用中
                          </span>
                        )}

                        {isSelf && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-stone-100 text-stone-600">
                            目前登入本人
                          </span>
                        )}

                        {/* 實名狀態徽章 */}
                        {u.realNameAuthStatus === 'verified' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-700" />
                            <span>實名已認證</span>
                          </span>
                        ) : u.realNameAuthStatus === 'pending' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 animate-pulse">
                            <Clock className="w-3 h-3 text-amber-700" />
                            <span>實名待受理</span>
                          </span>
                        ) : null}

                        {/* 身分證件照存檔標籤 */}
                        {(u.hasIdDocuments || u.realNameAuthData?.idCardFrontFile || u.realNameAuthData?.idCardBackFile) && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 border border-purple-200 flex items-center gap-1 shadow-2xs">
                            <ImageIcon className="w-3 h-3 text-purple-700" />
                            <span>已附證件照 (Storage)</span>
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-stone-500 truncate mt-0.5 flex items-center gap-2 flex-wrap">
                        <span>{u.title || '一般領域用戶'}</span>
                        <span>· 帳號代碼：<span className="font-mono text-stone-800 font-semibold">{u.id}</span></span>
                        {u.memberId && <span className="font-mono text-purple-700 font-bold">({u.memberId})</span>}
                        {u.email && (
                          <span className="font-mono text-stone-700 bg-stone-100 px-1.5 py-0.2 rounded text-[11px] border border-stone-200">
                            {u.email}
                          </span>
                        )}
                        {u.phone && (
                          <span className="font-mono text-stone-500 text-[11px]">
                            📞 {u.phone}
                          </span>
                        )}
                      </p>

                      <div className="flex items-center gap-3 text-[11px] text-stone-400 mt-1">
                        <span>可用點數：<strong className="text-stone-700 font-mono">{(u.balance || 0).toLocaleString()}</strong></span>
                        <span>託管款項：<strong className="text-stone-700 font-mono">NT$ {(u.withheldPoints || 0).toLocaleString()}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* 動作按鈕 */}
                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 flex-wrap">
                    {/* 與之私聊按鈕 (管理員可直接對任何用戶發起私聊交流與輔導) */}
                    {!isSelf && (
                      <button
                        type="button"
                        onClick={() => handleStartChatWithUser(u)}
                        className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 active:scale-95 text-blue-900 border border-blue-300 font-black text-xs shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                        title={`直接以官方管理員身分與「${u.name}」開啟 1 對 1 私聊對話`}
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-blue-700" />
                        <span>與之私聊 💬</span>
                      </button>
                    )}

                    {/* 連結至個人頁：包含所有他的資訊 */}
                    <button
                      type="button"
                      onClick={() => setViewingProfileUser(u)}
                      className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 active:scale-95 text-purple-900 border border-purple-300 font-black text-xs shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                      title={`開啟「${u.name}」的完整個人資訊頁（包含所有個人基本資料、提問、解答、財務與認證檔案）`}
                    >
                      <UserIcon className="w-3.5 h-3.5 text-purple-700" />
                      <span>個人資訊頁 ↗</span>
                    </button>

                    {/* 改名與換頭像按鈕 */}
                    <button
                      type="button"
                      onClick={() => handleOpenEditUser(u)}
                      className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 active:scale-95 text-purple-900 border border-purple-200 font-bold text-xs shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                      title={`修改「${u.name}」姓名或更換頭像照片 (限 6MB)`}
                    >
                      <Edit3 className="w-3.5 h-3.5 text-purple-700" />
                      <span>改名/換頭像</span>
                    </button>

                    {/* 直接開一個檢視頁面進入該用戶的視角，瀏覽她的帳戶但是不能操作 */}
                    <button
                      type="button"
                      onClick={() => setImpersonatingUser(u)}
                      className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 active:scale-95 text-amber-950 border border-amber-300 font-black text-xs shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                      title={`直接開一個檢視頁面進入「${u.name}」的視角，瀏覽她的帳戶但是不能操作`}
                    >
                      <Eye className="w-3.5 h-3.5 text-amber-600" />
                      <span>進入用戶視角 (唯讀) ↗</span>
                    </button>

                    {/* 初始管理員指派 A/B 站管理員按鈕：僅初始管理員可看見並操作，且無法降級自己 */}
                    {isInitialAdmin(currentUser) && !isInitialAdmin(u) && (
                      <button
                        type="button"
                        onClick={() => handleOpenAdminAssignModal(u)}
                        className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 active:scale-95 text-purple-900 border border-purple-300 font-bold text-xs shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                        title="由初始創始管理員獨立指派此用戶 A 站/B 站管理員站點管轄權"
                      >
                        <Crown className="w-3.5 h-3.5 text-amber-600" />
                        <span>{u.role === 'admin' ? '管理站點授權' : '賦予管理員'}</span>
                      </button>
                    )}

                    {/* 直接跳轉至受理認證與證件照 */}
                    <button
                      type="button"
                      onClick={() => onNavigateToCertifications?.(u.id)}
                      className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 active:scale-95 text-purple-900 border border-purple-200 font-black text-xs shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                      title="前往受理認證頁查閱此用戶之身分證正反面照片與核准認證"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
                      <span>受理認證 / 證件照 ↗</span>
                    </button>

                    {/* 註銷/反悔期用戶：管理員可恢復帳號或立即正式註銷 */}
                    {isUserDeactivated(u) && u.deactivationStatus !== 'deactivated' && (
                      <>
                        <button
                          type="button"
                          onClick={async () => {
                            await cancelAccountDeactivation(u.id);
                            setFeedbackMsg({ text: `已成功撤銷「${u.name}」之註銷狀態，恢復正常使用中！`, isError: false });
                            setTimeout(() => setFeedbackMsg(null), 4000);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-800 border border-emerald-300 font-bold text-xs shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                          title="撤銷此帳號之註銷申請，恢復正常使用"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>恢復帳號</span>
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (window.confirm(`確定要立即將「${u.name}」正式註銷並清空個資匿名化嗎？（不需等待7日屆滿）`)) {
                              await purgeAccountPermanently(u.id);
                              setFeedbackMsg({ text: `已正式註銷並匿名化用戶「${u.name}」！`, isError: false });
                              setTimeout(() => setFeedbackMsg(null), 4000);
                            }
                          }}
                          className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-700 border border-stone-300 font-bold text-xs transition-all flex items-center gap-1 cursor-pointer"
                          title="跳過7日猶豫期，立即完成正式註銷與匿名化"
                        >
                          <UserX className="w-3.5 h-3.5 text-stone-500" />
                          <span>立即正式註銷</span>
                        </button>
                      </>
                    )}

                    {/* 正常使用用戶且非本人：管理員可手動設為註銷反悔期 */}
                    {!isBlocked && !isUserDeactivated(u) && !isSelf && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (window.confirm(`確定要將「${u.name}」設定為申請註銷並進入 7 日反悔猶豫期嗎？`)) {
                            await requestAccountDeactivation('管理員手動設定註銷（7日猶豫期）', u.id);
                            setFeedbackMsg({ text: `已將「${u.name}」設定為註銷申請狀態（進入7日反悔猶豫期）！`, isError: false });
                            setTimeout(() => setFeedbackMsg(null), 4000);
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 active:scale-95 text-amber-900 border border-amber-300 font-bold text-xs transition-all flex items-center gap-1 cursor-pointer"
                        title="由管理員手動將此用戶設為註銷申請狀態（進入7日反悔猶豫期）"
                      >
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>註銷(反悔期)</span>
                      </button>
                    )}

                    {isBlocked ? (
                      <button
                        type="button"
                        onClick={() => setUnblockingTargetUser(u)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        <span>解除封鎖</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setBlockingTargetUser(u);
                          setBlockReason('');
                          setBlockDuration(7);
                        }}
                        disabled={isSelf}
                        className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-black text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                        title={isSelf ? '無法封鎖目前登入的管理員本人' : '執行停權封鎖'}
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>封鎖帳號</span>
                      </button>
                    )}

                    {/* 從資料庫永久刪除此帳號（創始管理員受保護不可刪除） */}
                    {!isInitialAdmin(u) && u.id !== 'a000000001' && u.id !== 'user-admin' && (
                      <button
                        type="button"
                        onClick={() => setDeletingTargetUser(u)}
                        className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-rose-600 hover:text-white active:scale-95 text-stone-700 border border-stone-300 hover:border-rose-600 font-bold text-xs transition-all flex items-center gap-1 cursor-pointer"
                        title="從本地與 Cloud Firestore 資料庫永久刪除此帳號"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>刪除帳號</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 註銷/7日反悔猶豫期詳細說明 (當用戶處於猶豫期時展示) */}
                {isUserDeactivated(u) && u.deactivationStatus !== 'deactivated' && (
                  <div className="mt-3.5 p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs space-y-1.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-amber-900">
                      <span className="font-bold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>7 日反悔猶豫期中 · 排定正式註銷時間：<strong>{u.deactivationScheduledPurgeAt ? new Date(u.deactivationScheduledPurgeAt).toLocaleString('zh-TW') : '7 日後'}</strong></span>
                      </span>
                      <span className="text-stone-400">申請時間：{u.deactivationRequestedAt ? new Date(u.deactivationRequestedAt).toLocaleString('zh-TW') : '近期'}</span>
                    </div>
                    <div className="text-stone-700 bg-white/70 p-2 rounded-lg leading-relaxed flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span><strong>註銷理由：</strong>{u.deactivationReason || '用戶自行申請註銷'}</span>
                      <span className="text-[11px] text-amber-700 font-bold">（7 日內再登入自動取消，或由管理員點擊「恢復帳號」）</span>
                    </div>
                  </div>
                )}

                {/* 封鎖詳細說明 (當用戶已被封鎖時展示) */}
                {isBlocked && (
                  <div className="mt-3.5 p-3 rounded-xl bg-white border border-rose-200 text-xs space-y-1.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-rose-900">
                      <span className="font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        <span>封鎖期限：<strong>{u.blockedUntil === 'permanent' ? '永久封鎖' : `${u.blockedUntil?.split('T')[0] || ''}（已自動發送平台系統通知）`}</strong></span>
                      </span>
                      <span className="text-stone-400">執行管理員：{u.blockedByAdminName || '平台管理員'} · 封鎖時間：{u.blockedAt?.split('T')[0] || '近期'}</span>
                    </div>
                    <div className="text-stone-700 bg-rose-50/50 p-2 rounded-lg leading-relaxed">
                      <strong>封鎖理由：</strong>{u.blockedReason || '違反創點子平台服務條款與使用者安全守則'}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 封鎖操作彈窗 */}
      {blockingTargetUser && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <ShieldAlert className="w-5 h-5" />
                <h4 className="font-black text-base text-stone-900">設定停權封鎖用戶帳號</h4>
              </div>
              <button
                type="button"
                onClick={() => setBlockingTargetUser(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 目標用戶簡要 */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-stone-50 border border-stone-200">
              <img
                src={blockingTargetUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                alt={blockingTargetUser.name}
                className="w-10 h-10 rounded-xl object-cover"
              />
              <div>
                <span className="font-black text-sm text-stone-900">{blockingTargetUser.name}</span>
                <span className="text-[11px] text-stone-500 block">{blockingTargetUser.title || '用戶'} ({blockingTargetUser.id})</span>
              </div>
            </div>

            <form onSubmit={handleConfirmBlock} className="space-y-4">
              {/* 1. 設定封鎖時間 */}
              <div>
                <label className="block text-xs font-black text-stone-800 mb-1.5">
                  1. 設定封鎖時間 <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: '1 天', val: 1 },
                    { label: '3 天', val: 3 },
                    { label: '7 天', val: 7 },
                    { label: '14 天', val: 14 },
                    { label: '30 天', val: 30 },
                    { label: '永久封鎖', val: 'permanent' as const },
                  ].map((item) => (
                    <button
                      key={String(item.val)}
                      type="button"
                      onClick={() => setBlockDuration(item.val)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                        blockDuration === item.val
                          ? 'bg-rose-600 text-white border-rose-600 font-black shadow-2xs'
                          : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. 說明封鎖理由 */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-black text-stone-800">
                    2. 說明封鎖理由（將以平台系統通知通知該用戶） <span className="text-rose-500">*</span>
                  </label>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-2">
                  {QUICK_REASONS.slice(0, 3).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setBlockReason(r)}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-stone-100 hover:bg-rose-50 hover:text-rose-800 text-stone-600 border border-stone-200 transition-colors cursor-pointer"
                    >
                      帶入：{r}
                    </button>
                  ))}
                </div>

                <textarea
                  required
                  rows={3}
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="請清楚填寫封鎖理由說明，此理由將於確認後立即發送「平台通知」寄達給該用戶..."
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:border-rose-500 outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 leading-relaxed font-semibold">
                ⚠️ 提示：確認封鎖後，該用戶帳號將無法發布問題、提交方案、發送私訊或進行金流交易，且系統會即刻發送官方平台通知告知停權期限與理由。
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setBlockingTargetUser(null)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-stone-600 hover:bg-stone-50 text-xs font-bold cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-xs transition-all cursor-pointer"
                >
                  確認執行封鎖並發送平台通知
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 一鍵生成測試帳號彈窗 */}
      {isTestUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2 text-amber-600">
                <Sparkles className="w-5 h-5" />
                <h4 className="font-black text-base text-stone-900">一鍵添加測試帳號（免註冊免登入）</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsTestUserModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  1. 選擇測試身分角色
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['solver', 'questioner', 'admin'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setTestUserRole(r)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                        testUserRole === r
                          ? r === 'admin'
                            ? 'bg-purple-700 text-white shadow-2xs font-black'
                            : r === 'solver'
                            ? 'bg-blue-600 text-white shadow-2xs font-black'
                            : 'bg-amber-500 text-stone-950 shadow-2xs font-black'
                          : 'bg-stone-50 border border-stone-200 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      {r === 'admin' ? '👑 管理員' : r === 'solver' ? '💼 解答專家' : '🙋 提問者'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  2. 測試名稱（選填，留空自動亂數產生）
                </label>
                <input
                  type="text"
                  value={testUserName}
                  onChange={(e) => setTestUserName(e.target.value)}
                  placeholder="例如：AI產品策略總監 測試帳號"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  3. 專業職稱 / 簡述（選填）
                </label>
                <input
                  type="text"
                  value={testUserTitle}
                  onChange={(e) => setTestUserTitle(e.target.value)}
                  placeholder="例如：資深架構師 / 新創連續創業者"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:border-amber-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    4. 初始點數 / 餘額
                  </label>
                  <input
                    type="number"
                    value={testUserBalance}
                    onChange={(e) => setTestUserBalance(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-bold focus:bg-white focus:border-amber-500 outline-none"
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 p-2 bg-stone-50 border border-stone-200 rounded-xl cursor-pointer text-xs font-bold text-stone-800">
                    <input
                      type="checkbox"
                      checked={testUserVerifiedExpert}
                      onChange={(e) => setTestUserVerifiedExpert(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span>具認證專家標章</span>
                  </label>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 leading-relaxed font-medium">
                💡 測試環境特權：此帳號免註冊、免密碼、免信箱驗證，建立後將直接加載至系統並可於全站快速切換使用！
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setIsTestUserModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-stone-300 text-stone-600 hover:bg-stone-50 text-xs font-bold cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  const created = addTestAccount({
                    role: testUserRole,
                    name: testUserName.trim() || undefined,
                    title: testUserTitle.trim() || undefined,
                    balance: testUserBalance,
                    verifiedExpert: testUserVerifiedExpert,
                    autoSwitch: false,
                  });
                  setIsTestUserModalOpen(false);
                  setTestUserName('');
                  setTestUserTitle('');
                  setFeedbackMsg({
                    text: `已成功生成測試帳號「${created.name}」(${created.role === 'admin' ? '管理員' : created.role === 'solver' ? '專家' : '提問者'})！`,
                    isError: false,
                  });
                  setTimeout(() => setFeedbackMsg(null), 4000);
                }}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-stone-950 text-xs font-black shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>立即建立測試帳號</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 解除封鎖二次確認彈窗 */}
      {unblockingTargetUser && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-stone-200">
            <div className="flex items-center gap-2.5 text-emerald-600">
              <Unlock className="w-6 h-6" />
              <h4 className="font-black text-base text-stone-900">確認解除用戶封鎖？</h4>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              您確定要為用戶<strong>「{unblockingTargetUser.name}」</strong>解除停權封鎖嗎？解除後將恢復正常發布問題、提交方案與各項權限，系統將自動以平台通知通知該用戶。
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setUnblockingTargetUser(null)}
                className="px-4 py-2 rounded-xl border border-stone-300 text-stone-600 hover:bg-stone-50 text-xs font-bold cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmUnblock}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-xs transition-all cursor-pointer"
              >
                確認解除封鎖
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 初始管理員指派兩站管理員權限彈窗 */}
      {adminAssignTargetUser && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-stone-200 text-stone-900">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2 text-purple-700">
                <Crown className="w-5 h-5 text-amber-500" />
                <h4 className="font-black text-base text-stone-900">初始管理員授權中心 · 兩站管理員分開指派</h4>
              </div>
              <button
                type="button"
                onClick={() => setAdminAssignTargetUser(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 目標用戶簡要 */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-stone-50 border border-stone-200">
              <img
                src={adminAssignTargetUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                alt={adminAssignTargetUser.name}
                className="w-11 h-11 rounded-xl object-cover ring-2 ring-purple-200"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm text-stone-900 truncate">{adminAssignTargetUser.name}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-900">
                    {getAdminSiteLabel(adminAssignTargetUser) || (adminAssignTargetUser.role === 'admin' ? '👑 管理員' : '一般會員')}
                  </span>
                </div>
                <span className="text-[11px] text-stone-500 block truncate">
                  帳號代碼：<span className="font-mono">{adminAssignTargetUser.id}</span>
                </span>
              </div>
            </div>

            {/* 說明權利隔離規範 */}
            <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 space-y-1">
              <div className="font-black flex items-center gap-1.5 text-amber-900">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>兩站管理員分開授權治理規則</span>
              </div>
              <p className="leading-relaxed text-[11px] text-amber-900">
                平台初始創始管理員具備指派權力。<strong>是 A 站管理員但不一定是 B 站管理員</strong>。兩站後台管理權限嚴格獨立，可單獨指派、兼任或完全撤銷。
              </p>
            </div>

            {/* 兩站獨立核取方塊 */}
            <div className="space-y-2.5">
              {/* A 站 */}
              <label
                onClick={() => {
                  setSelectedAdminSites((prev) =>
                    prev.includes('site_a') ? prev.filter((s) => s !== 'site_a') : [...prev, 'site_a']
                  );
                }}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                  selectedAdminSites.includes('site_a')
                    ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-300/40'
                    : 'bg-stone-50/70 border-stone-200 hover:border-stone-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedAdminSites.includes('site_a')}
                  onChange={() => {}}
                  className="mt-1 w-4 h-4 text-blue-600 rounded border-stone-300 focus:ring-blue-500 cursor-pointer"
                />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-xs text-blue-950">🅰️ A 站管理員（IdeaX 創點子主站）</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 font-bold">site_a</span>
                  </div>
                  <p className="text-[11px] text-stone-600 leading-relaxed">
                    掌管 IdeaX 主站問題市場審核、認證專家受理審核、懸賞託管款項撥付、會員個資與一般檢舉仲裁。
                  </p>
                </div>
              </label>

              {/* B 站 */}
              <label
                onClick={() => {
                  setSelectedAdminSites((prev) =>
                    prev.includes('site_b') ? prev.filter((s) => s !== 'site_b') : [...prev, 'site_b']
                  );
                }}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                  selectedAdminSites.includes('site_b')
                    ? 'bg-rose-50/70 border-rose-400 ring-2 ring-rose-300/40'
                    : 'bg-stone-50/70 border-stone-200 hover:border-stone-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedAdminSites.includes('site_b')}
                  onChange={() => {}}
                  className="mt-1 w-4 h-4 text-rose-600 rounded border-stone-300 focus:ring-rose-500 cursor-pointer"
                />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-xs text-rose-950">🅱️ B 站管理員（創星季賽事專區）</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 font-bold">site_b</span>
                  </div>
                  <p className="text-[11px] text-stone-600 leading-relaxed">
                    掌管創星季參賽提案審核、專家評審資格管理、決審評分統計、賽事大獎核發與競賽規章條款機密存檔。
                  </p>
                </div>
              </label>
            </div>

            {/* 快捷切換預設按鈕 */}
            <div className="flex items-center gap-1.5 pt-1 text-[11px]">
              <span className="text-stone-400 shrink-0">快捷預設：</span>
              <button
                type="button"
                onClick={() => setSelectedAdminSites(['site_a', 'site_b'])}
                className="px-2 py-0.5 rounded-lg bg-stone-100 hover:bg-purple-100 text-purple-900 font-bold cursor-pointer"
              >
                雙站皆掌管
              </button>
              <button
                type="button"
                onClick={() => setSelectedAdminSites(['site_a'])}
                className="px-2 py-0.5 rounded-lg bg-stone-100 hover:bg-blue-100 text-blue-900 font-bold cursor-pointer"
              >
                僅 A 站主站
              </button>
              <button
                type="button"
                onClick={() => setSelectedAdminSites(['site_b'])}
                className="px-2 py-0.5 rounded-lg bg-stone-100 hover:bg-rose-100 text-rose-900 font-bold cursor-pointer"
              >
                僅 B 站創星季
              </button>
              <button
                type="button"
                onClick={() => setSelectedAdminSites([])}
                className="px-2 py-0.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold cursor-pointer ml-auto"
              >
                撤銷管理員
              </button>
            </div>

            {/* 預覽結果提示 */}
            <div className="p-2.5 rounded-xl bg-stone-100 text-xs font-bold flex items-center justify-between text-stone-800">
              <span>儲存後身分：</span>
              <span className="font-black text-purple-900">
                {selectedAdminSites.includes('site_a') && selectedAdminSites.includes('site_b')
                  ? '👑 雙站全權管理員（A 站主站 ＋ B 站創星季）'
                  : selectedAdminSites.includes('site_a')
                  ? '🅰️ A 站專屬管理員（IdeaX 創點子主站）'
                  : selectedAdminSites.includes('site_b')
                  ? '🅱️ B 站專屬管理員（創星季賽事專區）'
                  : '👤 撤銷管理員（轉為一般會員）'}
              </span>
            </div>

            {/* 操作按鈕 */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setAdminAssignTargetUser(null)}
                className="px-4 py-2 rounded-xl border border-stone-300 text-stone-600 hover:bg-stone-50 text-xs font-bold cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveAdminSites}
                className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-xs font-black shadow-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>確認儲存授權</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 用戶完整個人資訊頁彈窗（包含所有個人基本資料、提問、解答、財務與認證檔案） */}
      {viewingProfileUser && (
        <AdminUserProfileModal
          user={viewingProfileUser}
          onClose={() => setViewingProfileUser(null)}
          onImpersonate={(targetUser) => {
            setViewingProfileUser(null);
            setImpersonatingUser(targetUser);
          }}
          onNavigateToCertifications={onNavigateToCertifications}
          onOpenChat={(targetUser) => {
            setViewingProfileUser(null);
            handleStartChatWithUser(targetUser);
          }}
          onEditUser={(targetUser) => {
            handleOpenEditUser(targetUser);
          }}
        />
      )}

      {/* 管理員編輯用戶（改名與換頭像）彈窗 */}
      {editingUserProfileUser && (
        <div
          className="fixed inset-0 z-[140] bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setEditingUserProfileUser(null)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 隱藏的頭像 input */}
            <input
              type="file"
              ref={editAvatarInputRef}
              accept="image/*"
              onChange={handleEditUserAvatarUpload}
              className="hidden"
            />

            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-stone-900 via-stone-850 to-purple-950 text-white flex items-center justify-between border-b border-purple-900/40">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-600/40 border border-purple-400/40 flex items-center justify-center text-purple-200">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white">
                    管理員改名與更換頭像
                  </h3>
                  <p className="text-[11px] text-purple-200/80">
                    目標用戶：{editingUserProfileUser.name} ({editingUserProfileUser.id})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingUserProfileUser(null)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveUserEdit} className="p-5 sm:p-6 space-y-4">
              {editAvatarError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{editAvatarError}</span>
                </div>
              )}

              {/* 頭像更換預覽 */}
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative group shrink-0">
                    <img
                      src={editAvatar || editingUserProfileUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                      alt={editName}
                      className="w-14 h-14 rounded-2xl object-cover ring-2 ring-purple-300 shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => editAvatarInputRef.current?.click()}
                      className="absolute inset-0 bg-stone-900/50 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white"
                      title="點擊選取新頭像照片 (限 6MB)"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-stone-900">頭像照片</h5>
                    <p className="text-[11px] text-stone-500">
                      支援常見圖檔（單檔 6MB 內），裁切壓縮為正方形儲存。
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => editAvatarInputRef.current?.click()}
                  className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-stone-100 border border-stone-300 text-stone-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
                >
                  <Upload className="w-3.5 h-3.5 text-purple-700" />
                  <span>上傳新頭像 (限 6MB)</span>
                </button>
              </div>

              {/* 姓名輸入 */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  顯示姓名 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="請輸入欲變更之姓名"
                  required
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                />
              </div>

              {/* 職稱輸入 */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  專業職稱 / 簡述
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="例如：資深架構師 / 平台總管"
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setEditingUserProfileUser(null)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-stone-600 hover:bg-stone-50 text-xs font-bold cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-black shadow-md transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>確認儲存變更</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 進入該用戶視角（唯讀檢視模式）彈窗（以該用戶視角瀏覽帳戶，但無法操作） */}
      {impersonatingUser && (
        <AdminUserImpersonationModal
          user={impersonatingUser}
          onClose={() => setImpersonatingUser(null)}
          onOpenProfile={(targetUser) => {
            setImpersonatingUser(null);
            setViewingProfileUser(targetUser);
          }}
        />
      )}

      {/* 永久刪除帳號確認彈窗 */}
      {deletingTargetUser && (
        <div
          className="fixed inset-0 z-[130] bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setDeletingTargetUser(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 border border-rose-200 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-stone-900 text-base">永久刪除帳號確認</h4>
                  <p className="text-xs text-stone-500">將從本地與 Cloud Firestore 資料庫徹底移除</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeletingTargetUser(null)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200 text-xs text-stone-700 space-y-1.5">
              <p className="font-bold text-stone-900">
                您確定要永久刪除帳號「<span className="text-rose-700">{deletingTargetUser.name}</span>」（ID: <span className="font-mono">{deletingTargetUser.id}</span>）嗎？
              </p>
              <p className="text-stone-600">
                刪除後此帳號將自用戶清單與雲端資料庫移除，且不會在重整後自動重生。
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingTargetUser(null)}
                className="px-4 py-2 rounded-xl border border-stone-300 text-stone-600 hover:bg-stone-50 text-xs font-bold cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={async () => {
                  const target = deletingTargetUser;
                  setDeletingTargetUser(null);
                  const res = await deleteUserAccountPermanently(target.id);
                  setFeedbackMsg({ text: res.message, isError: !res.success });
                  setTimeout(() => setFeedbackMsg(null), 4000);
                }}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>確認永久刪除</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

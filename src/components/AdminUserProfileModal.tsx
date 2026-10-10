import React, { useState } from 'react';
import {
  X,
  User as UserIcon,
  ShieldCheck,
  Lock,
  Clock,
  Star,
  Coins,
  FileQuestion,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  Eye,
  Award,
  Calendar,
  Briefcase,
  ExternalLink,
  ImageIcon,
  Mail,
  Phone,
  Building,
  CreditCard,
  Crown,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Info,
  Check,
  Sparkles,
  AlertTriangle,
  FileText,
  HelpCircle,
} from 'lucide-react';
import { User, ProblemLevel } from '../types';
import { LEVEL_CONFIGS } from '../data/mockData';
import { useApp } from '../context/AppContext';
import { CopyableUserId } from './CopyableUserId';
import { getAdminSiteBadgeClass, getAdminSiteLabel } from '../utils/adminPermissions';

interface AdminUserProfileModalProps {
  user: User;
  onClose: () => void;
  onImpersonate?: (user: User) => void;
  onNavigateToCertifications?: (userId?: string) => void;
}

export const AdminUserProfileModal: React.FC<AdminUserProfileModalProps> = ({
  user,
  onClose,
  onImpersonate,
  onNavigateToCertifications,
}) => {
  const { questions, answers, transactions, solvers } = useApp();
  const [activeTab, setActiveTab] = useState<'bio' | 'questions' | 'answers' | 'finance' | 'security'>('bio');

  // 關聯的提問、方案與交易
  const userQuestions = questions.filter(
    (q) => q.authorId === user.id || q.authorName === user.name
  );
  const userAnswers = answers.filter(
    (a) => a.solverId === user.id || a.solverName === user.name
  );
  const userTransactions = transactions.filter(
    (t) => t.toUserId === user.id || t.fromUserId === user.id || t.solverId === user.id || t.toUserName === user.name || t.fromUserName === user.name || (t as any).userId === user.id
  );
  const solverInfo = solvers.find((s) => s.id === user.id || s.name === user.name);

  const isBlocked = Boolean(user.isBlocked);
  const isDeactivated = user.deactivationStatus === 'deactivated';
  const isDeactivating = Boolean(user.deactivationRequestedAt && !isDeactivated);

  // 輔助標籤翻譯
  const formatGender = (g?: string) => {
    switch (g) {
      case 'male': return '男性';
      case 'female': return '女性';
      case 'other': return '其他';
      default: return '未透露';
    }
  };

  const formatAgeGroup = (ag?: string) => {
    switch (ag) {
      case 'under_18': return '18 歲以下';
      case '18_24': return '18 ~ 24 歲';
      case '25_34': return '25 ~ 34 歲';
      case '35_44': return '35 ~ 44 歲';
      case '45_54': return '45 ~ 54 歲';
      case '55_above': return '55 歲以上';
      default: return '未透露';
    }
  };

  const formatSalary = (sal?: string) => {
    switch (sal) {
      case 'under_500k': return '50 萬以下';
      case '500k_1000k': return '50 ~ 100 萬';
      case '1000k_2000k': return '100 ~ 200 萬';
      case '2000k_3000k': return '200 ~ 300 萬';
      case 'above_3000k': return '300 萬以上';
      default: return '不透露';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="max-w-5xl w-full max-h-[94vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden relative my-3">
        {/* ========================================================================= */}
        {/* 頂部 Header */}
        {/* ========================================================================= */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-stone-900 via-stone-800 to-purple-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 border-b border-purple-900/40">
          <div className="flex items-start sm:items-center gap-4">
            <div className="relative shrink-0">
              <img
                src={
                  user.avatar ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                }
                alt={user.name}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-2 ring-purple-400 shadow-md"
              />
              {user.isInitialAdmin && (
                <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-stone-950 p-1 rounded-full shadow-md" title="初始創始管理員">
                  <Crown className="w-3.5 h-3.5 fill-current" />
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl sm:text-2xl font-black text-white">{user.name}</h3>
                
                {/* 角色徽章 */}
                <span
                  className={`text-[11px] font-black px-2.5 py-0.5 rounded-full ${
                    user.role === 'admin'
                      ? 'bg-purple-500 text-white'
                      : user.role === 'solver'
                      ? 'bg-blue-500 text-white'
                      : 'bg-amber-400 text-stone-950'
                  }`}
                >
                  {user.role === 'admin' ? '👑 管理員' : user.role === 'solver' ? '💼 解答者' : '🙋 提問者'}
                </span>

                {/* 站點管理員徽章 */}
                {user.role === 'admin' && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getAdminSiteBadgeClass(user) || 'bg-purple-100 text-purple-900 border-purple-300'}`}>
                    {getAdminSiteLabel(user) || '全站管理員'}
                  </span>
                )}

                {/* 帳號狀態徽章 */}
                {isBlocked ? (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-600 text-white flex items-center gap-1 shadow-2xs">
                    <Lock className="w-3 h-3" />
                    <span>已封鎖停權</span>
                  </span>
                ) : isDeactivating ? (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-stone-950 font-bold flex items-center gap-1 shadow-2xs">
                    <Clock className="w-3 h-3" />
                    <span>7日反悔猶豫期中</span>
                  </span>
                ) : isDeactivated ? (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-stone-500 text-white">
                    已註銷
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white">
                    正常使用中
                  </span>
                )}

                {/* 實名狀態 */}
                {user.realNameAuthStatus === 'verified' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>實名已認證</span>
                  </span>
                )}

                {/* 專家徽章 */}
                {user.verifiedExpert && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-stone-950 flex items-center gap-1">
                    <Award className="w-3 h-3" />
                    <span>認證專家</span>
                  </span>
                )}

                {/* 競賽徽章 */}
                {user.competitionBadges && user.competitionBadges.map((badge, idx) => (
                  <span key={idx} className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500 text-white flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>{badge}</span>
                  </span>
                ))}
              </div>

              <p className="text-xs sm:text-sm text-stone-300 mt-1 font-medium">
                {user.title || '一般領域用戶'} · {user.company || '個人創作者'}
              </p>

              <div className="mt-2 flex items-center gap-2 flex-wrap text-xs text-stone-300">
                <CopyableUserId userId={user.id} prefix="用戶ID: " />
                {user.memberId && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white/10 text-stone-300">
                    規範會員碼: {user.memberId}
                  </span>
                )}
                {user.username && (
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-white/10 text-stone-300">
                    帳號: @{user.username}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 頂部操作鈕 */}
          <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
            {/* 進入該用戶視角（唯讀）按鈕 */}
            {onImpersonate && (
              <button
                type="button"
                onClick={() => onImpersonate(user)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 text-stone-950 font-black text-xs shadow-md transition-transform active:scale-95 flex items-center gap-1.5 cursor-pointer"
                title="直接開一個檢視頁面進入該用戶的視角，瀏覽她的帳戶但是不能操作"
              >
                <Eye className="w-4 h-4 text-stone-950" />
                <span>進入用戶視角 (唯讀) ↗</span>
              </button>
            )}

            {onNavigateToCertifications && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateToCertifications(user.id);
                }}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                title="查看該用戶受理認證及身分證件照片存檔"
              >
                <ShieldCheck className="w-4 h-4 text-purple-300" />
                <span className="hidden sm:inline">受理認證</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="關閉"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 核心統計指標列 */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-3 sm:p-4 bg-stone-100/80 border-b border-stone-200 text-stone-800 text-center shrink-0">
          <div className="p-2.5 rounded-xl bg-white border border-stone-200">
            <span className="text-[10px] text-stone-400 font-bold block">可用點數</span>
            <span className="text-base font-black text-stone-900 font-mono mt-0.5 block">
              {(user.balance || 0).toLocaleString()} 點
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-white border border-stone-200">
            <span className="text-[10px] text-stone-400 font-bold block">託管中款項</span>
            <span className="text-base font-black text-amber-700 font-mono mt-0.5 block">
              NT$ {(user.withheldPoints || 0).toLocaleString()}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-white border border-stone-200">
            <span className="text-[10px] text-stone-400 font-bold block">評分口碑</span>
            <div className="flex items-center justify-center gap-1 mt-0.5">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="text-base font-black text-stone-900 font-mono">
                {user.rating || 5.0}
              </span>
            </div>
            <span className="text-[9px] text-stone-400">({user.reviewCount || 0} 則評價)</span>
          </div>

          <div className="p-2.5 rounded-xl bg-white border border-stone-200">
            <span className="text-[10px] text-stone-400 font-bold block">累積提問 / 痛點</span>
            <span className="text-base font-black text-blue-700 font-mono mt-0.5 block">
              {userQuestions.length} 則
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-white border border-stone-200 col-span-2 sm:col-span-1">
            <span className="text-[10px] text-stone-400 font-bold block">累積解答方案</span>
            <span className="text-base font-black text-purple-700 font-mono mt-0.5 block">
              {userAnswers.length} 案
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 導覽分頁列 */}
        {/* ========================================================================= */}
        <div className="flex items-center gap-1 px-4 sm:px-6 bg-stone-50 border-b border-stone-200 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('bio')}
            className={`px-4 py-3 text-xs font-black border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'bio'
                ? 'border-purple-600 text-purple-900 bg-white shadow-2xs'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5 text-purple-600" />
            <span>個人基本資料與履歷</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('questions')}
            className={`px-4 py-3 text-xs font-black border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'questions'
                ? 'border-purple-600 text-purple-900 bg-white shadow-2xs'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <FileQuestion className="w-3.5 h-3.5 text-blue-600" />
            <span>發布提問與痛點 ({userQuestions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('answers')}
            className={`px-4 py-3 text-xs font-black border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'answers'
                ? 'border-purple-600 text-purple-900 bg-white shadow-2xs'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
            <span>解答與提案方案 ({userAnswers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('finance')}
            className={`px-4 py-3 text-xs font-black border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'finance'
                ? 'border-purple-600 text-purple-900 bg-white shadow-2xs'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <Wallet className="w-3.5 h-3.5 text-emerald-600" />
            <span>財務點數與流水 ({userTransactions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`px-4 py-3 text-xs font-black border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'security'
                ? 'border-purple-600 text-purple-900 bg-white shadow-2xs'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-rose-600" />
            <span>實名認證與帳號安全檔案</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* 分頁內容主體 */}
        {/* ========================================================================= */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-5 bg-white">
          {/* TAB 1: 個人基本資料與履歷 */}
          {activeTab === 'bio' && (
            <div className="space-y-5">
              {/* 基本聯絡與通訊資料卡 */}
              <div className="p-4 sm:p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
                <h4 className="text-xs font-black text-stone-900 uppercase tracking-wider flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-purple-600" />
                  <span>基本通訊與個人屬性資料</span>
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-xl border border-stone-200 space-y-0.5">
                    <span className="text-stone-400 block text-[11px]">電子郵件 Email</span>
                    <span className="font-bold text-stone-900 flex items-center gap-1.5 truncate">
                      <Mail className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span>{user.email || '未設定'}</span>
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-stone-200 space-y-0.5">
                    <span className="text-stone-400 block text-[11px]">聯絡電話 Phone</span>
                    <span className="font-bold text-stone-900 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span>{user.phone || '未填寫'}</span>
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-stone-200 space-y-0.5">
                    <span className="text-stone-400 block text-[11px]">性別與年齡層</span>
                    <span className="font-bold text-stone-900">
                      {formatGender(user.gender)} · {formatAgeGroup(user.ageGroup)}
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-stone-200 space-y-0.5">
                    <span className="text-stone-400 block text-[11px]">任職機構 / 公司</span>
                    <span className="font-bold text-stone-900 flex items-center gap-1.5 truncate">
                      <Building className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span>{user.company || '自由業 / 個人工作室'}</span>
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-stone-200 space-y-0.5">
                    <span className="text-stone-400 block text-[11px]">行業與目前職位</span>
                    <span className="font-bold text-stone-900">
                      {user.industry || '未註記'} · {user.jobTitle || user.title || '一般領域'}
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-stone-200 space-y-0.5">
                    <span className="text-stone-400 block text-[11px]">目前年薪區間</span>
                    <span className="font-bold text-stone-900">
                      {formatSalary(user.annualSalary)}
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-stone-200 space-y-0.5">
                    <span className="text-stone-400 block text-[11px]">帳號註冊日期</span>
                    <span className="font-bold text-stone-900 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span>{user.joinedDate ? new Date(user.joinedDate).toLocaleDateString('zh-TW') : '系統創始'}</span>
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-stone-200 space-y-0.5">
                    <span className="text-stone-400 block text-[11px]">會員方案等級</span>
                    <span className="font-bold text-purple-700 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>{user.subscriptionTier ? user.subscriptionTier.toUpperCase() : 'FREE 一般方案'}</span>
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-stone-200 space-y-0.5">
                    <span className="text-stone-400 block text-[11px]">榮譽稱號與信用</span>
                    <span className="font-bold text-stone-900">
                      {user.honorTitle || '誠信探索家'} (信用: {user.reputation || 100})
                    </span>
                  </div>
                </div>
              </div>

              {/* 自我介紹與簡介 */}
              <div className="p-4 sm:p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                <h4 className="text-xs font-black text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-purple-600" />
                  <span>個人簡介與實戰經歷 (Bio)</span>
                </h4>
                <p className="text-xs sm:text-sm text-stone-700 leading-relaxed whitespace-pre-line bg-white p-3.5 rounded-xl border border-stone-200">
                  {user.bio || '此用戶尚未填寫詳細個人簡介或背景介紹。'}
                </p>
              </div>

              {/* 核心專業領域與技能標籤 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2.5">
                  <h4 className="text-xs font-black text-stone-800">專業主領域與子領域</h4>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-3 py-1 rounded-xl bg-stone-900 text-white font-bold text-xs">
                      {user.domain || solverInfo?.domain || '一般領域 / 跨領域'}
                    </span>
                    {(user.subdomain || (user as any).subcategory || solverInfo?.subcategory) && (
                      <span className="px-3 py-1 rounded-xl bg-purple-100 text-purple-900 font-bold text-xs border border-purple-200">
                        {user.subdomain || (user as any).subcategory || solverInfo?.subcategory}
                      </span>
                    )}
                  </div>
                  {user.domains && user.domains.length > 0 && (
                    <div className="pt-2 border-t border-stone-200/60 text-xs">
                      <span className="text-stone-400 text-[11px] block mb-1">複選領域標記：</span>
                      <div className="flex flex-wrap gap-1">
                        {user.domains.map((d, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-md bg-stone-200 text-stone-800 text-[11px] font-bold">
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2.5">
                  <h4 className="text-xs font-black text-stone-800">精通技能與專長標籤</h4>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(user.skills && user.skills.length > 0
                      ? user.skills
                      : solverInfo?.skills && solverInfo.skills.length > 0
                      ? solverInfo.skills
                      : ['跨界溝通', '問題分析', '解決方案設計']
                    ).map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-white border border-stone-300 text-stone-800 text-xs font-bold"
                      >
                        #{skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* 解答者 L0 ~ L4 等級題目解答分佈 */}
              {solverInfo && (
                <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-purple-950 flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-purple-600" />
                      <span>解答各等級問題解答分佈（L0 ~ L4）</span>
                    </h4>
                    <span className="text-xs font-bold text-purple-800 font-mono">
                      採納率：{solverInfo.acceptedRate || 85}%
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-2 text-center">
                    {(['L0', 'L1', 'L2', 'L3', 'L4'] as ProblemLevel[]).map((lvl) => {
                      const cfg = LEVEL_CONFIGS[lvl];
                      const count = solverInfo.levelAnswerCounts?.[lvl] ?? Math.max(1, Math.round(solverInfo.answerCount * 0.2));
                      return (
                        <div key={lvl} className="p-2.5 rounded-xl bg-white border border-purple-200">
                          <span className="text-[10px] font-black text-purple-700">{lvl}</span>
                          <div className="text-base font-black text-stone-900 font-mono mt-0.5">
                            {count}
                          </div>
                          <span className="text-[9px] text-stone-500 block truncate">{cfg.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 調研問卷數據（若用戶曾填寫） */}
              {user.surveyData && (
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
                  <h4 className="text-xs font-black text-stone-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-stone-500" />
                    <span>用戶調研問卷回饋紀錄</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-white rounded-xl border border-stone-200">
                      <span className="text-stone-400 block text-[11px]">平台使用頻率</span>
                      <span className="font-bold text-stone-800 mt-0.5 block">{user.surveyData.usageFrequency || '每週數次'}</span>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-stone-200">
                      <span className="text-stone-400 block text-[11px]">有意願作為副業接案</span>
                      <span className="font-bold text-stone-800 mt-0.5 block">{user.surveyData.willingToBeSideHustle || '是，非常有意願'}</span>
                    </div>
                    {user.surveyData.feedbackSuggestions && (
                      <div className="p-3 bg-white rounded-xl border border-stone-200 sm:col-span-2">
                        <span className="text-stone-400 block text-[11px]">給予平台的建議</span>
                        <p className="font-bold text-stone-800 mt-1">{user.surveyData.feedbackSuggestions}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: 發布的提問與痛點清單 */}
          {activeTab === 'questions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-stone-900">
                  【{user.name}】發布的問題與痛點（共 {userQuestions.length} 題）
                </h4>
              </div>

              {userQuestions.length === 0 ? (
                <div className="p-10 text-center text-stone-400 text-xs font-bold bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                  <FileQuestion className="w-8 h-8 text-stone-300 mx-auto" />
                  <p>此用戶目前尚未在平台上發布過任何問題或痛點。</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {userQuestions.map((q) => (
                    <div
                      key={q.id}
                      className="p-4 rounded-2xl bg-stone-50 border border-stone-200 hover:border-purple-300 transition-colors space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-stone-200 text-stone-800 font-mono">
                            {q.level || 'L1'}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-900">
                            {q.category} · {q.subcategory}
                          </span>
                          {q.postType === 'pain_point' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                              💡 痛點提出
                            </span>
                          )}
                          <h5 className="font-black text-sm text-stone-900">{q.title}</h5>
                        </div>
                        <span className="text-xs font-black text-amber-700 font-mono shrink-0">
                          懸賞 ${(q.bounty || 0).toLocaleString()} 點
                        </span>
                      </div>

                      <p className="text-xs text-stone-600 line-clamp-2">{q.description}</p>

                      <div className="flex items-center justify-between pt-2 border-t border-stone-200/60 text-[11px] text-stone-500">
                        <span>發布時間：{new Date(q.createdAt).toLocaleDateString('zh-TW')}</span>
                        <div className="flex items-center gap-3">
                          <span>已收方案：<strong className="text-stone-800 font-mono">{q.answersCount || 0}</strong> 個</span>
                          <span>點閱觀看：<strong className="text-stone-800 font-mono">{q.viewsCount || 0}</strong> 次</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: 提供的解答與接案方案 */}
          {activeTab === 'answers' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-stone-900">
                  【{user.name}】提交的解答方案與接案專案（共 {userAnswers.length} 案）
                </h4>
              </div>

              {userAnswers.length === 0 ? (
                <div className="p-10 text-center text-stone-400 text-xs font-bold bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                  <Lightbulb className="w-8 h-8 text-stone-300 mx-auto" />
                  <p>此用戶目前尚未在平台上提出任何解答方案。</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {userAnswers.map((a) => (
                    <div
                      key={a.id}
                      className="p-4 rounded-2xl bg-stone-50 border border-stone-200 hover:border-purple-300 transition-colors space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              a.isAccepted
                                ? 'bg-emerald-600 text-white'
                                : 'bg-stone-200 text-stone-700'
                            }`}
                          >
                            {a.isAccepted ? '✅ 已獲採納撥款' : '方案評選 / 審核中'}
                          </span>
                          <span className="text-xs font-bold text-stone-800 font-mono">
                            對應問題代碼: {a.questionId}
                          </span>
                        </div>
                        {(a.price || (a as any).pointsEarned) ? (
                          <span className="text-xs font-black text-emerald-700 font-mono">
                            獲得獎勵 +${((a.price || (a as any).pointsEarned) as number).toLocaleString()} 點
                          </span>
                        ) : null}
                      </div>

                      <p className="text-xs text-stone-700 line-clamp-3 bg-white p-3 rounded-xl border border-stone-200/80">
                        {a.fullContent || a.freePreview || (a as any).content || '無方案文字說明'}
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1 border-t border-stone-200/60">
                        <span>提交時間：{new Date(a.createdAt).toLocaleDateString('zh-TW')}</span>
                        {a.phases && a.phases.length > 0 && (
                          <span>階段交付進度：{a.phases.filter((p: any) => p.status === 'accepted').length} / {a.phases.length} 階段驗收</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: 財務點數與交易流水 */}
          {activeTab === 'finance' && (
            <div className="space-y-5">
              {/* 財務錢包總覽大卡片 */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
                  <span className="text-[11px] text-stone-400 font-bold block">可用點數餘額</span>
                  <div className="text-xl font-black text-stone-900 font-mono">
                    {(user.balance || 0).toLocaleString()} <span className="text-xs font-normal text-stone-500">點</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1">
                  <span className="text-[11px] text-amber-800 font-bold block">託管進行中款項</span>
                  <div className="text-xl font-black text-amber-900 font-mono">
                    NT$ {(user.withheldPoints || 0).toLocaleString()}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1">
                  <span className="text-[11px] text-emerald-800 font-bold block">累計成交總營業額</span>
                  <div className="text-xl font-black text-emerald-900 font-mono">
                    NT$ {(user.totalRevenue || 0).toLocaleString()}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-1">
                  <span className="text-[11px] text-purple-800 font-bold block">累計已撥款至銀行</span>
                  <div className="text-xl font-black text-purple-900 font-mono">
                    NT$ {(user.totalPaidOut || user.totalWithdrawn || 0).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* 銀行撥款帳戶資訊 */}
              <div className="p-4 sm:p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
                <h4 className="text-xs font-black text-stone-900 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-purple-600" />
                  <span>銀行撥款與提領綁定帳戶</span>
                </h4>
                {user.bankAccount ? (
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-white rounded-xl border border-stone-200">
                      <span className="text-stone-400 block text-[11px]">銀行名稱與代碼</span>
                      <span className="font-bold text-stone-900 mt-0.5 block">{user.bankAccount.bankName} ({user.bankAccount.bankCode})</span>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-stone-200">
                      <span className="text-stone-400 block text-[11px]">分行名稱</span>
                      <span className="font-bold text-stone-900 mt-0.5 block">{user.bankAccount.branchName || '總行營業部'}</span>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-stone-200">
                      <span className="text-stone-400 block text-[11px]">戶名</span>
                      <span className="font-bold text-stone-900 mt-0.5 block">{user.bankAccount.accountHolder}</span>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-stone-200">
                      <span className="text-stone-400 block text-[11px]">銀行帳號</span>
                      <span className="font-bold text-stone-900 font-mono mt-0.5 block">{user.bankAccount.accountNumber}</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-white rounded-xl border border-stone-200 text-xs text-stone-500">
                    此用戶尚未綁定銀行撥款帳戶。
                  </div>
                )}
              </div>

              {/* 點數交易流水紀錄清單 */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-stone-900">
                  交易與點數異動流水明細（共 {userTransactions.length} 筆）
                </h4>

                {userTransactions.length === 0 ? (
                  <div className="p-8 text-center text-stone-400 text-xs font-bold bg-stone-50 rounded-2xl border border-stone-200">
                    尚無任何點數交易流水紀錄。
                  </div>
                ) : (
                  <div className="divide-y divide-stone-100 border border-stone-200 rounded-2xl overflow-hidden">
                    {userTransactions.map((tx) => (
                      <div key={tx.id} className="p-3.5 sm:p-4 flex items-center justify-between bg-white text-xs">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                              tx.type === 'bounty_earned' || tx.type === 'recharge'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-stone-100 text-stone-700'
                            }`}
                          >
                            {tx.type === 'bounty_earned' || tx.type === 'recharge' ? (
                              <ArrowDownLeft className="w-4 h-4" />
                            ) : (
                              <ArrowUpRight className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-stone-900">{(tx as any).description || tx.note || tx.type || tx.relatedQuestionTitle || '點數交易'}</div>
                            <div className="text-[11px] text-stone-400 font-mono mt-0.5">
                              {new Date(tx.createdAt).toLocaleString('zh-TW')} · 序號: {tx.id}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span
                            className={`font-black font-mono text-sm ${
                              tx.amount > 0 ? 'text-emerald-700' : 'text-stone-900'
                            }`}
                          >
                            {tx.amount > 0 ? `+${tx.amount.toLocaleString()}` : tx.amount.toLocaleString()} 點
                          </span>
                          <span className="block text-[10px] text-stone-400">
                            {tx.status === '已完成' || tx.status === '成功' || (tx as any).status === 'completed' ? '已入帳完成' : tx.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: 實名認證與帳號安全檔案 */}
          {activeTab === 'security' && (
            <div className="space-y-5">
              {/* 實名認證資料與證件儲存 */}
              <div className="p-4 sm:p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
                <h4 className="text-xs font-black text-stone-900 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                    <span>實名認證 (KYC) 詳細個資審核記錄</span>
                  </span>
                  {onNavigateToCertifications && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onNavigateToCertifications(user.id);
                      }}
                      className="text-purple-700 hover:text-purple-900 font-black text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <span>前往受理認證審核頁面 ↗</span>
                    </button>
                  )}
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-xl border border-stone-200">
                    <span className="text-stone-400 block text-[11px]">實名核驗現況</span>
                    <span className="font-bold text-stone-900 mt-1 block">
                      {user.realNameAuthStatus === 'verified'
                        ? '✅ 已完成實名認證'
                        : user.realNameAuthStatus === 'pending'
                        ? '⏳ 申請審核中（待受理）'
                        : user.realNameAuthStatus === 'rejected'
                        ? '❌ 審核未通過'
                        : '○ 尚未申請實名認證'}
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-stone-200">
                    <span className="text-stone-400 block text-[11px]">法定真實姓名</span>
                    <span className="font-bold text-stone-900 mt-1 block">
                      {user.realNameAuthData?.legalName || user.name}
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-stone-200">
                    <span className="text-stone-400 block text-[11px]">身分證字號 / 居留證號</span>
                    <span className="font-bold text-stone-900 font-mono mt-1 block">
                      {user.realNameAuthData?.idNumber
                        ? `${user.realNameAuthData.idNumber.slice(0, 3)}****${user.realNameAuthData.idNumber.slice(-3)}`
                        : '未登記'}
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-stone-200">
                    <span className="text-stone-400 block text-[11px]">國籍與出生年月日</span>
                    <span className="font-bold text-stone-900 mt-1 block">
                      {user.realNameAuthData?.nationality || '中華民國'} · {user.realNameAuthData?.birthDate || '未登記'}
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-stone-200 sm:col-span-2">
                    <span className="text-stone-400 block text-[11px]">戶籍或通訊登記住址</span>
                    <span className="font-bold text-stone-900 mt-1 block">
                      {user.realNameAuthData?.idAddress || user.realNameAuthData?.address || '未提供'}
                    </span>
                  </div>
                </div>

                {/* 證件照封存狀態 */}
                <div className="pt-2 border-t border-stone-200/60">
                  <span className="text-[11px] text-stone-400 font-bold block mb-2">身分證件正反面存檔（安全雲端儲存）：</span>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-white border border-stone-200 text-xs">
                      <ImageIcon className="w-4 h-4 text-purple-600" />
                      <span>正面檔案：{user.realNameAuthData?.idCardFrontFile?.name || '已封存身分證正面'}</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-white border border-stone-200 text-xs">
                      <ImageIcon className="w-4 h-4 text-purple-600" />
                      <span>反面檔案：{user.realNameAuthData?.idCardBackFile?.name || '已封存身分證反面'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 帳號治理處分與站點授權狀態 */}
              <div className="p-4 sm:p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
                <h4 className="text-xs font-black text-stone-900 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-stone-600" />
                  <span>帳號處分、註銷與站點授權記錄</span>
                </h4>

                <div className="space-y-2 text-xs">
                  <div className="p-3 bg-white rounded-xl border border-stone-200 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-stone-900">停權封鎖狀態：</span>
                      <span className={isBlocked ? 'text-rose-600 font-black ml-1' : 'text-emerald-700 font-bold ml-1'}>
                        {isBlocked ? '⚠️ 目前處於停權封鎖中' : '✅ 正常狀態，無違規封鎖處分'}
                      </span>
                    </div>
                    {isBlocked && (user.blockedReason || (user as any).blockReason) && (
                      <span className="text-stone-500">封鎖原因: {user.blockedReason || (user as any).blockReason}</span>
                    )}
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-stone-200 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-stone-900">帳號註銷申請：</span>
                      <span className="text-stone-700 ml-1">
                        {isDeactivated
                          ? '已正式註銷'
                          : isDeactivating
                          ? '處於 7 日反悔猶豫期中'
                          : '無註銷申請'}
                      </span>
                    </div>
                    {user.deactivationScheduledPurgeAt && (
                      <span className="text-amber-700 font-mono text-[11px]">
                        預計清除日: {new Date(user.deactivationScheduledPurgeAt).toLocaleDateString('zh-TW')}
                      </span>
                    )}
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-stone-200">
                    <span className="font-bold text-stone-900">站點管理員權限：</span>
                    <span className="text-purple-900 font-bold ml-1">
                      {user.role === 'admin'
                        ? getAdminSiteLabel(user) || '👑 平台管理員'
                        : '一般會員無後台管理權限'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 服務條款簽署紀錄 */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2 text-xs">
                <h4 className="font-black text-stone-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>服務條款與使用者協議同意時戳</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-stone-600">
                  <div className="p-2.5 bg-white rounded-lg border border-stone-200">
                    <span className="block text-stone-400">一般服務條款</span>
                    <span className="font-bold text-stone-800">已同意 · 系統預設</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-stone-200">
                    <span className="block text-stone-400">提問者服務條款</span>
                    <span className="font-bold text-stone-800">{user.hasAgreedQuestionerTerms ? '已簽署同意' : '尚未發問簽署'}</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-stone-200">
                    <span className="block text-stone-400">解答者服務條款</span>
                    <span className="font-bold text-stone-800">{user.hasAgreedSolverTerms ? '已簽署同意' : '尚未接案簽署'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 底部退出與切換列 */}
        {/* ========================================================================= */}
        <div className="p-3 px-6 bg-stone-100 border-t border-stone-200 text-center text-[11px] text-stone-500 flex items-center justify-between shrink-0">
          <span>IdeaX 創點子用戶全貌個人資訊檔案資料庫</span>
          {onImpersonate && (
            <button
              type="button"
              onClick={() => onImpersonate(user)}
              className="text-amber-800 hover:text-amber-900 font-black text-xs hover:underline cursor-pointer flex items-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5 text-amber-600" />
              <span>直接開一個檢視頁面進入該用戶的視角 (唯讀) ↗</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

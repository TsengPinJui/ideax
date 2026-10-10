import React, { useState } from 'react';
import {
  X,
  Eye,
  Lock,
  Wallet,
  Coins,
  FileQuestion,
  Lightbulb,
  CreditCard,
  User as UserIcon,
  ShieldCheck,
  Calendar,
  AlertCircle,
  Briefcase,
  ExternalLink,
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Clock,
  Sparkles,
  Info,
  Award,
} from 'lucide-react';
import { User, Question, Answer, Transaction } from '../types';
import { useApp } from '../context/AppContext';
import { CopyableUserId } from './CopyableUserId';

interface AdminUserImpersonationModalProps {
  user: User;
  onClose: () => void;
  onOpenProfile?: (user: User) => void;
}

export const AdminUserImpersonationModal: React.FC<AdminUserImpersonationModalProps> = ({
  user,
  onClose,
  onOpenProfile,
}) => {
  const { questions, answers, transactions, solvers } = useApp();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'questions' | 'proposals' | 'transactions' | 'profile' | 'certs'
  >('overview');

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

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="max-w-5xl w-full h-[94vh] flex flex-col bg-stone-50 rounded-3xl shadow-2xl border-2 border-amber-400 overflow-hidden relative my-2">
        {/* ========================================================================= */}
        {/* 頂部管理員「唯讀視角」警示橫幅 */}
        {/* ========================================================================= */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-orange-600 text-white px-4 sm:px-6 py-3 flex items-center justify-between shadow-md shrink-0 border-b-2 border-amber-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-black/20 flex items-center justify-center shrink-0 border border-amber-200/50">
              <Eye className="w-5 h-5 text-amber-100" />
            </div>
            <div>
              <div className="font-black text-sm sm:text-base flex items-center gap-2 flex-wrap">
                <span>目前正在以【{user.name}】的視角瀏覽個人帳戶</span>
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-stone-950 text-amber-300 border border-amber-400 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  <span>唯讀檢視模式 • 無法操作</span>
                </span>
              </div>
              <p className="text-xs text-amber-100 mt-0.5 hidden sm:block">
                此頁面忠實呈現該用戶登入後所見之個人中心介面。為維護帳號真實性與安全性，所有儲值、發布、修改等操作均已全面鎖定。
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onOpenProfile && (
              <button
                type="button"
                onClick={() => onOpenProfile(user)}
                className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs transition-colors cursor-pointer hidden md:flex items-center gap-1"
                title="切換至該用戶之完整個人檔案資訊頁"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>個人資訊頁 ↗</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-stone-950 hover:bg-stone-900 text-white font-black text-xs shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
              title="關閉並退出此用戶的帳戶視角"
            >
              <X className="w-4 h-4" />
              <span>退出用戶視角</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 用戶個人儀表板頂部名片 */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-5 bg-white border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5">
            <img
              src={
                user.avatar ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
              }
              alt={user.name}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover ring-2 ring-stone-200 shrink-0"
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-stone-900">{user.name}</h2>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    user.role === 'admin'
                      ? 'bg-purple-100 text-purple-900 border border-purple-200'
                      : user.role === 'solver'
                      ? 'bg-blue-100 text-blue-900 border border-blue-200'
                      : 'bg-amber-100 text-amber-900 border border-amber-200'
                  }`}
                >
                  {user.role === 'admin' ? '👑 管理員' : user.role === 'solver' ? '💼 解答者' : '🙋 提問者'}
                </span>
                {user.verifiedExpert && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200">
                    認證專家
                  </span>
                )}
                {user.realNameAuthStatus === 'verified' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                    實名已認證
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 font-medium mt-0.5">{user.title || '一般領域用戶'}</p>
              <div className="mt-1 flex items-center gap-2">
                <CopyableUserId userId={user.id} prefix="用戶代碼: " />
              </div>
            </div>
          </div>

          {/* 視角錢包快報 */}
          <div className="flex items-center gap-3 bg-stone-50 p-3 rounded-2xl border border-stone-200 self-stretch sm:self-auto justify-between sm:justify-start">
            <div>
              <span className="text-[10px] text-stone-400 font-bold block">可用點數</span>
              <span className="text-lg font-black text-stone-900 font-mono">
                {(user.balance || 0).toLocaleString()} 點
              </span>
            </div>
            <div className="h-8 w-px bg-stone-200" />
            <div>
              <span className="text-[10px] text-stone-400 font-bold block">託管中款項</span>
              <span className="text-base font-black text-amber-700 font-mono">
                NT$ {(user.withheldPoints || 0).toLocaleString()}
              </span>
            </div>
            {/* 唯讀儲值按鈕示意 */}
            <button
              type="button"
              disabled
              className="ml-2 px-3 py-1.5 rounded-xl bg-stone-200 text-stone-400 text-xs font-bold cursor-not-allowed flex items-center gap-1 opacity-75"
              title="唯讀檢視模式下無法執行儲值操作"
            >
              <Lock className="w-3 h-3 text-stone-400" />
              <span>點數儲值</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 用戶視角導覽分頁列 */}
        {/* ========================================================================= */}
        <div className="flex items-center gap-1 px-4 sm:px-6 bg-stone-100 border-b border-stone-200 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-3 text-xs font-black border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'overview'
                ? 'border-amber-500 text-amber-950 bg-white shadow-2xs'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <Wallet className="w-3.5 h-3.5 text-amber-600" />
            <span>帳戶總覽</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('questions')}
            className={`px-4 py-3 text-xs font-black border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'questions'
                ? 'border-amber-500 text-amber-950 bg-white shadow-2xs'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <FileQuestion className="w-3.5 h-3.5 text-blue-600" />
            <span>我的提問 ({userQuestions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('proposals')}
            className={`px-4 py-3 text-xs font-black border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'proposals'
                ? 'border-amber-500 text-amber-950 bg-white shadow-2xs'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5 text-purple-600" />
            <span>我的方案與接案 ({userAnswers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('transactions')}
            className={`px-4 py-3 text-xs font-black border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'transactions'
                ? 'border-amber-500 text-amber-950 bg-white shadow-2xs'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
            <span>點數交易流水 ({userTransactions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-3 text-xs font-black border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'profile'
                ? 'border-amber-500 text-amber-950 bg-white shadow-2xs'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5 text-stone-600" />
            <span>個人基本資料</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('certs')}
            className={`px-4 py-3 text-xs font-black border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'certs'
                ? 'border-amber-500 text-amber-950 bg-white shadow-2xs'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
            <span>實名與專家認證</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* 分頁內容展示（全部按鍵與輸入框均受唯讀保護） */}
        {/* ========================================================================= */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-5 bg-white">
          {/* TAB 1: 帳戶總覽 */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {/* 唯讀提醒條 */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2.5 text-xs text-amber-900">
                <Info className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>用戶視角模式說明：</strong>此處顯示用戶個人看板各項數據與狀態，管理員可審閱其餘額、已發題目與接案進度。所有操作已被防護鎖定。
                </span>
              </div>

              {/* 3大看板卡片 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                  <div className="flex items-center justify-between text-stone-500 text-xs font-bold">
                    <span>錢包可用點數</span>
                    <Coins className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="text-2xl font-black text-stone-900 font-mono">
                    {(user.balance || 0).toLocaleString()} <span className="text-xs font-normal text-stone-500">點</span>
                  </div>
                  <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between text-[11px] text-stone-400">
                    <span>折合台幣約</span>
                    <span className="font-mono font-bold text-stone-700">NT$ {((user.balance || 0) * 1).toLocaleString()}</span>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-2">
                  <div className="flex items-center justify-between text-amber-800 text-xs font-bold">
                    <span>進行中託管款項</span>
                    <Lock className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-2xl font-black text-amber-900 font-mono">
                    NT$ {(user.withheldPoints || 0).toLocaleString()}
                  </div>
                  <div className="pt-2 border-t border-amber-200/60 text-[11px] text-amber-700">
                    等待解答確認驗收後撥付
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                  <div className="flex items-center justify-between text-stone-500 text-xs font-bold">
                    <span>平台綜合信用</span>
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-stone-900 font-mono">
                      {user.rating || 5.0}
                    </span>
                    <span className="text-xs text-stone-500">★ 滿分 5.0</span>
                  </div>
                  <div className="pt-2 border-t border-stone-200/60 text-[11px] text-stone-400">
                    累計被採納方案 {solverInfo?.answerCount || userAnswers.length} 次
                  </div>
                </div>
              </div>

              {/* 最近動態摘要 */}
              <div className="p-4 sm:p-5 rounded-2xl border border-stone-200 bg-stone-50/50 space-y-3">
                <h4 className="text-xs font-black text-stone-900 uppercase tracking-wider">
                  用戶帳戶活動摘要
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
                  <div className="p-3 bg-white rounded-xl border border-stone-200">
                    <span className="text-stone-400 text-[11px]">發布問題數</span>
                    <span className="text-lg font-black text-stone-900 block mt-1 font-mono">{userQuestions.length}</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-stone-200">
                    <span className="text-stone-400 text-[11px]">提供解答數</span>
                    <span className="text-lg font-black text-stone-900 block mt-1 font-mono">{userAnswers.length}</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-stone-200">
                    <span className="text-stone-400 text-[11px]">採納成功率</span>
                    <span className="text-lg font-black text-emerald-600 block mt-1 font-mono">{solverInfo?.acceptedRate || 85}%</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-stone-200">
                    <span className="text-stone-400 text-[11px]">交易流水數</span>
                    <span className="text-lg font-black text-purple-700 block mt-1 font-mono">{userTransactions.length}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 我的提問 */}
          {activeTab === 'questions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-stone-900">
                  【{user.name}】發布的問題清單（共 {userQuestions.length} 題）
                </h4>
                {/* 唯讀按鈕示意 */}
                <button
                  type="button"
                  disabled
                  className="px-3 py-1.5 rounded-xl bg-stone-100 text-stone-400 text-xs font-bold cursor-not-allowed flex items-center gap-1 border border-stone-200"
                >
                  <Lock className="w-3 h-3" />
                  <span>提出新問題（唯讀鎖定）</span>
                </button>
              </div>

              {userQuestions.length === 0 ? (
                <div className="p-8 text-center text-stone-400 text-xs font-bold bg-stone-50 rounded-2xl border border-stone-200">
                  該用戶目前尚未發布過任何問題。
                </div>
              ) : (
                <div className="space-y-3">
                  {userQuestions.map((q) => (
                    <div
                      key={q.id}
                      className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-stone-200 text-stone-800 font-mono">
                            {q.level || 'L1'}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-900">
                            {q.category} · {q.subcategory}
                          </span>
                          <h5 className="font-black text-sm text-stone-900">{q.title}</h5>
                        </div>
                        <span className="text-xs font-black text-amber-700 font-mono shrink-0">
                          懸賞 ${q.bounty?.toLocaleString()} 點
                        </span>
                      </div>
                      <p className="text-xs text-stone-600 line-clamp-2">{q.description}</p>
                      <div className="flex items-center justify-between pt-2 border-t border-stone-200/60 text-[11px] text-stone-500">
                        <span>發布日期：{new Date(q.createdAt).toLocaleDateString('zh-TW')}</span>
                        <div className="flex items-center gap-2">
                          <span>收到方案：{q.answersCount || 0}</span>
                          <button
                            type="button"
                            disabled
                            className="px-2.5 py-1 rounded-lg bg-stone-200 text-stone-400 text-[11px] font-bold cursor-not-allowed"
                          >
                            管理方案 (唯讀)
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: 我的方案與接案 */}
          {activeTab === 'proposals' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-stone-900">
                  【{user.name}】提交的解答方案與專案（共 {userAnswers.length} 案）
                </h4>
              </div>

              {userAnswers.length === 0 ? (
                <div className="p-8 text-center text-stone-400 text-xs font-bold bg-stone-50 rounded-2xl border border-stone-200">
                  該用戶目前尚未提交過任何解答方案。
                </div>
              ) : (
                <div className="space-y-3">
                  {userAnswers.map((a) => (
                    <div
                      key={a.id}
                      className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              a.isAccepted
                                ? 'bg-emerald-600 text-white'
                                : 'bg-stone-200 text-stone-700'
                            }`}
                          >
                            {a.isAccepted ? '✅ 方案已被採納' : '評選中 / 審核中'}
                          </span>
                          <span className="text-xs font-bold text-stone-800 font-mono">
                            對應問題 ID: {a.questionId}
                          </span>
                        </div>
                        {(a.price || (a as any).pointsEarned) ? (
                          <span className="text-xs font-black text-emerald-700 font-mono">
                            獲得獎金 +${((a.price || (a as any).pointsEarned) as number).toLocaleString()} 點
                          </span>
                        ) : null}
                      </div>

                      <p className="text-xs text-stone-700 line-clamp-3">{a.fullContent || a.freePreview || (a as any).content || '無方案文字說明'}</p>

                      <div className="flex items-center justify-between pt-2 border-t border-stone-200/60 text-[11px] text-stone-500">
                        <span>提交日期：{new Date(a.createdAt).toLocaleDateString('zh-TW')}</span>
                        <button
                          type="button"
                          disabled
                          className="px-2.5 py-1 rounded-lg bg-stone-200 text-stone-400 text-[11px] font-bold cursor-not-allowed"
                        >
                          修改提案 (鎖定)
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: 點數交易流水 */}
          {activeTab === 'transactions' && (
            <div className="space-y-4">
              <h4 className="text-xs font-black text-stone-900">
                【{user.name}】的點數交易明細流水帳（共 {userTransactions.length} 筆）
              </h4>

              {userTransactions.length === 0 ? (
                <div className="p-8 text-center text-stone-400 text-xs font-bold bg-stone-50 rounded-2xl border border-stone-200">
                  尚無任何點數流水交易紀錄。
                </div>
              ) : (
                <div className="divide-y divide-stone-100 border border-stone-200 rounded-2xl overflow-hidden bg-stone-50/50">
                  {userTransactions.map((tx) => (
                    <div key={tx.id} className="p-3.5 sm:p-4 flex items-center justify-between bg-white text-xs">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            tx.type === '解答採納撥付' || tx.type === '階段交付撥付' || tx.type === '點數儲值' || (tx as any).type === 'bounty_earned' || (tx as any).type === 'recharge'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-stone-100 text-stone-700'
                          }`}
                        >
                          {tx.type === '解答採納撥付' || tx.type === '階段交付撥付' || tx.type === '點數儲值' || (tx as any).type === 'bounty_earned' || (tx as any).type === 'recharge' ? (
                            <ArrowDownLeft className="w-4 h-4" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-stone-900">{(tx as any).description || tx.note || tx.type || tx.relatedQuestionTitle || '點數交易'}</div>
                          <div className="text-[11px] text-stone-400 font-mono mt-0.5">
                            {new Date(tx.createdAt).toLocaleString('zh-TW')}
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
                          {tx.status === '已完成' || tx.status === '成功' || (tx as any).status === 'completed' ? '已入帳' : tx.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: 個人基本資料 */}
          {activeTab === 'profile' && (
            <div className="space-y-4 max-w-2xl">
              <div className="p-3 bg-stone-100 border border-stone-200 rounded-xl text-xs text-stone-600 flex items-center gap-2">
                <Lock className="w-4 h-4 text-stone-500 shrink-0" />
                <span>此處為個人中心「基本資料與隱私設定」預覽，輸入項處於唯讀狀態。</span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">姓名 / 暱稱</label>
                  <input
                    type="text"
                    value={user.name}
                    readOnly
                    disabled
                    className="w-full p-2.5 rounded-xl border border-stone-300 bg-stone-100 text-stone-700 font-bold cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">專業頭銜 / 職稱</label>
                  <input
                    type="text"
                    value={user.title || ''}
                    readOnly
                    disabled
                    className="w-full p-2.5 rounded-xl border border-stone-300 bg-stone-100 text-stone-700 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">個人簡介與專業背景</label>
                  <textarea
                    rows={4}
                    value={user.bio || ''}
                    readOnly
                    disabled
                    className="w-full p-2.5 rounded-xl border border-stone-300 bg-stone-100 text-stone-700 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">專業主領域</label>
                  <input
                    type="text"
                    value={user.domain || solverInfo?.domain || '一般領域'}
                    readOnly
                    disabled
                    className="w-full p-2.5 rounded-xl border border-stone-300 bg-stone-100 text-stone-700 cursor-not-allowed"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    disabled
                    className="px-4 py-2 rounded-xl bg-stone-200 text-stone-400 font-black text-xs cursor-not-allowed flex items-center gap-1.5"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>儲存修改（唯讀鎖定）</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: 實名與專家認證 */}
          {activeTab === 'certs' && (
            <div className="space-y-4 max-w-2xl">
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3 text-xs">
                <h4 className="font-black text-stone-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  <span>實名認證申辦現況</span>
                </h4>
                <div className="space-y-1.5 text-stone-700">
                  <div>認證審核狀態：<b>{user.realNameAuthStatus === 'verified' ? '已核准完成' : user.realNameAuthStatus === 'pending' ? '審核中' : '未申辦'}</b></div>
                  <div>身分證件儲存：<b>{user.realNameAuthData?.idCardFrontFile ? '已上傳並安全封存' : '未附檔案'}</b></div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3 text-xs">
                <h4 className="font-black text-stone-900 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-600" />
                  <span>專家資格與評定</span>
                </h4>
                <div className="space-y-1.5 text-stone-700">
                  <div>認證專家標籤：<b>{user.verifiedExpert ? '已通過認證專家標章' : '一般用戶身分'}</b></div>
                  <div>方案採納次數：<b>{solverInfo?.answerCount || 0} 次</b></div>
                  <div>口碑評價評分：<b>{user.rating || 5.0} 星</b></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 底部退出列 */}
        {/* ========================================================================= */}
        <div className="p-3 px-6 bg-stone-100 border-t border-stone-200 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2 text-stone-500 text-[11px]">
            <Lock className="w-3.5 h-3.5 text-amber-600" />
            <span>您目前處於唯讀視角，所有點數扣除、提案及設定均受到保護。</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-black text-xs cursor-pointer shadow-xs transition-colors"
          >
            退出用戶視角
          </button>
        </div>
      </div>
    </div>
  );
};

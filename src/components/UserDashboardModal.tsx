import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { resolveUserAvatar } from '../utils/userDisplay';
import { X, ShieldCheck, Wallet, UserCheck, Lock, CheckCircle, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';

interface UserDashboardModalProps {
  onClose: () => void;
}

export const UserDashboardModal: React.FC<UserDashboardModalProps> = ({ onClose }) => {
  const { currentUser, setCurrentUser, showToast } = useApp();
  const [topUpAmount, setTopUpAmount] = useState<number>(5000);
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'wallet' | 'membership'>('profile');

  const handleTopUp = () => {
    setCurrentUser((prev) => ({
      ...prev,
      balance: prev.balance + topUpAmount,
    }));
    confetti({ particleCount: 60, spread: 70 });
    showToast(`💳 儲值成功！已成功撥入 NT$ ${topUpAmount.toLocaleString()} 點數！`);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img
              src={resolveUserAvatar(currentUser.avatar, false)}
              alt={currentUser.name}
              className="w-12 h-12 rounded-full object-cover border-2 border-indigo-400"
            />
            <div>
              <h2 className="text-lg font-black text-white flex items-center">
                {currentUser.name}
                {currentUser.verifiedExpert && (
                  <ShieldCheck className="w-4 h-4 ml-1.5 text-indigo-400 inline" />
                )}
              </h2>
              <p className="text-xs text-slate-400">{currentUser.email || 'alex.chang@ideax.tw'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub Tabs */}
        <div className="flex border-b border-slate-200 px-6 pt-3 space-x-4">
          <button
            onClick={() => setActiveSubTab('profile')}
            className={`pb-3 font-bold text-xs border-b-2 transition-colors ${
              activeSubTab === 'profile'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            個人資料
          </button>
          <button
            onClick={() => setActiveSubTab('wallet')}
            className={`pb-3 font-bold text-xs border-b-2 transition-colors ${
              activeSubTab === 'wallet'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            點數錢包 (NT$ {currentUser.balance.toLocaleString()})
          </button>
          <button
            onClick={() => setActiveSubTab('membership')}
            className={`pb-3 font-bold text-xs border-b-2 transition-colors ${
              activeSubTab === 'membership'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            會員方案管理
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeSubTab === 'profile' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="font-bold text-slate-800">專業顧問簡介</div>
                <p className="text-slate-600 leading-relaxed">{currentUser.bio}</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="font-bold text-slate-800">專長領域與標籤</div>
                <div className="flex flex-wrap gap-1.5">
                  {(currentUser.skills || []).map((sk, idx) => (
                    <span key={idx} className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium">
                      {sk}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100 flex items-center justify-between">
                <div>
                  <div className="font-bold text-indigo-950 flex items-center">
                    <UserCheck className="w-4 h-4 mr-1 text-indigo-600" />
                    實名認證與專家審查狀態
                  </div>
                  <div className="text-[11px] text-indigo-700 mt-0.5">
                    已通過官方高級實名認證，具備高階落地方案與諮詢接案權限
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] border border-emerald-200 flex items-center">
                  <CheckCircle className="w-3 h-3 mr-1" /> 已認證
                </span>
              </div>
            </div>
          )}

          {activeSubTab === 'wallet' && (
            <div className="space-y-6">
              <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-lg space-y-2">
                <div className="text-xs font-bold text-indigo-200 flex items-center justify-between">
                  <span>創點子封閉式點數錢包</span>
                  <Wallet className="w-5 h-5" />
                </div>
                <div className="text-3xl font-black tracking-tight">
                  NT$ {currentUser.balance.toLocaleString()}
                </div>
                <div className="text-[11px] text-indigo-200">
                  可隨時用於站內發布付費懸賞、購買痛點解鎖方案或專家諮詢
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700">
                  快捷儲值點數（第三方支付安全收單）
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[3000, 5000, 10000, 30000, 50000, 100000].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setTopUpAmount(amt)}
                      className={`py-3 rounded-xl border text-xs font-bold transition-all ${
                        topUpAmount === amt
                          ? 'bg-indigo-50 border-indigo-600 text-indigo-700 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      NT$ {amt.toLocaleString()}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleTopUp}
                  className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-md shadow-indigo-100 transition-all mt-4"
                >
                  確認儲值 NT$ {topUpAmount.toLocaleString()}
                </button>
              </div>
            </div>
          )}

          {activeSubTab === 'membership' && (
            <div className="space-y-4 text-xs">
              <div className="p-5 rounded-2xl bg-indigo-50 border border-indigo-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-950 text-sm">專業專家訂閱方案 (Pro Tier)</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-600 text-white font-bold text-[10px]">
                    生效中
                  </span>
                </div>
                <p className="text-indigo-800 text-xs">
                  享有 5% 服務費超低抽成特權、AI-CRM 軍師特助全功能解鎖及首頁優先推薦曝光。
                </p>
                <div className="text-[11px] text-indigo-600 pt-2 border-t border-indigo-200/60">
                  效期至：{currentUser.memberExpireAt}（自動續約已開啟）
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

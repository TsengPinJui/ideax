import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { resolveUserAvatar } from '../utils/userDisplay';
import { X, Sparkles, UserCheck, ShieldCheck, ArrowRight, MessageSquare } from 'lucide-react';

interface AiHeadhunterModalProps {
  onClose: () => void;
}

export const AiHeadhunterModal: React.FC<AiHeadhunterModalProps> = ({ onClose }) => {
  const { solvers, startDirectChat, showToast } = useApp();
  const [demandQuery, setDemandQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [matchedSolvers, setMatchedSolvers] = useState(solvers);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!demandQuery.trim()) return;

    setIsSearching(true);
    setTimeout(() => {
      setIsSearching(false);
      const q = demandQuery.toLowerCase();
      const filtered = solvers.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.domain.toLowerCase().includes(q) ||
          s.title.toLowerCase().includes(q) ||
          s.skills.some((sk) => sk.toLowerCase().includes(q))
      );
      setMatchedSolvers(filtered.length > 0 ? filtered : solvers);
      showToast(`🎯 AI 智能獵頭已為您精準篩選出 ${filtered.length || solvers.length} 位推薦專家！`);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-2xl shadow-inner">
              <Sparkles className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white flex items-center">
                AI 智能獵頭專家精準媒合
              </h2>
              <p className="text-xs text-amber-100 mt-0.5">
                輸入您的業務痛點或專案需求，AI 演算法即刻為您推薦最合適的認證專家
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-amber-100 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-6 bg-amber-50/50 border-b border-amber-100">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={demandQuery}
              onChange={(e) => setDemandQuery(e.target.value)}
              placeholder="例如：需要大語言模型私有化部署、跨境電商金流架構、高併發資料庫調優..."
              className="flex-1 px-4 py-3 rounded-xl border border-amber-200 bg-white text-sm focus:ring-2 focus:ring-amber-500 outline-none shadow-sm"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="px-6 py-3 rounded-xl bg-amber-600 text-white font-bold text-sm hover:bg-amber-700 shadow-md transition-all flex items-center"
            >
              {isSearching ? '分析中...' : '智能媒合'}
            </button>
          </form>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            推薦認證專家顧問列表 ({matchedSolvers.length})
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {matchedSolvers.map((solver) => (
              <div
                key={solver.id}
                className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-amber-400 transition-all shadow-sm hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start space-x-3 mb-3">
                    <img
                      src={resolveUserAvatar(solver.avatar, false)}
                      alt={solver.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-amber-200 shadow-sm"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-slate-900 flex items-center">
                        <span className="truncate">{solver.name}</span>
                        <ShieldCheck className="w-4 h-4 text-amber-600 ml-1 shrink-0" />
                      </div>
                      <div className="text-xs text-slate-500 truncate">{solver.title}</div>
                      <div className="text-[11px] text-amber-700 font-semibold mt-0.5">
                        ⭐ {solver.rating} · 採納率 {solver.acceptedRate}% · 完成 {solver.completedProjects || 20}+ 專案
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 mb-3 leading-relaxed">
                    {solver.bio}
                  </p>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {(solver.skills || []).slice(0, 3).map((sk, idx) => (
                      <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-700">
                    一對一會談：NT$ {solver.pricePerSession?.toLocaleString() || '2,000'} / 次
                  </div>
                  <button
                    onClick={() => {
                      startDirectChat({
                        id: solver.id,
                        name: solver.name,
                        avatar: solver.avatar,
                        title: solver.title,
                      });
                      onClose();
                      showToast(`已為您開啟與「${solver.name}」的專屬洽談通道！`);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 font-bold text-xs transition-colors flex items-center"
                  >
                    <MessageSquare className="w-3.5 h-3.5 mr-1" />
                    預約洽談
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

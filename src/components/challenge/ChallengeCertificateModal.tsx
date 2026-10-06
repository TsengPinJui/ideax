import React from 'react';
import {
  X,
  Award,
  Download,
  Share2,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { ChallengeProposal } from '../../types/challengeTypes';

interface ChallengeCertificateModalProps {
  proposal: ChallengeProposal;
  onClose: () => void;
}

export const ChallengeCertificateModal: React.FC<ChallengeCertificateModalProps> = ({
  proposal,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const certificateNumber = `IDEAX-IC-2026-${proposal.id.replace('prop-', '').toUpperCase().slice(0, 8)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Header - Bright Theme */}
        <div className="px-5 py-3.5 bg-white text-stone-900 flex items-center justify-between shrink-0 border-b border-stone-200">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-black">
              <Award className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <span className="text-xs font-black text-stone-900">
              IdeaX 官方認證證書預覽
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Certificate Display Paper */}
        <div className="p-6 sm:p-8 bg-stone-50 flex-1 overflow-y-auto">
          <div className="relative p-6 sm:p-8 bg-gradient-to-b from-amber-50/50 via-white to-amber-50/30 rounded-2xl border-4 border-double border-amber-300 shadow-lg text-center space-y-5">
            {/* Top Gold Seal Header */}
            <div className="space-y-1">
              <div className="w-14 h-14 rounded-2xl bg-amber-400 text-stone-950 mx-auto flex items-center justify-center shadow-md shadow-amber-400/20">
                <Award className="w-8 h-8 text-stone-950" />
              </div>
              <p className="text-[10px] font-mono tracking-widest text-amber-800 font-bold uppercase pt-1">
                Official Certification of Innovation
              </p>
              <h2 className="text-lg sm:text-2xl font-black text-stone-950 tracking-tight">
                IdeaX 創新挑戰入選認證
              </h2>
            </div>

            {/* Certificate Body */}
            <div className="py-2 space-y-3 text-stone-800 text-xs sm:text-sm leading-relaxed border-y border-amber-200/80">
              <p className="text-stone-500 text-xs">茲證明創業創新團隊</p>
              <h3 className="text-base sm:text-lg font-black text-stone-950">
                【 {proposal.teamName || proposal.authorName} 】
              </h3>
              <p className="text-stone-500 text-xs">所提出之創新提案作品</p>
              <h4 className="text-sm sm:text-base font-black text-amber-900 px-4">
                《{proposal.title}》
              </h4>
              <p className="text-[11px] text-stone-600 max-w-sm mx-auto pt-1">
                經 IdeaX 創新挑戰季評審委員會與專業專家審查，符合創新創業主題、具備高度市場解決痛點之可行性，特頒此證以資證明。
              </p>
            </div>

            {/* Footer Metadata */}
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-stone-500 pt-2 font-mono">
              <div className="text-left">
                <span className="block text-stone-400">認證字號</span>
                <span className="font-bold text-stone-800">{certificateNumber}</span>
              </div>

              <div className="text-right">
                <span className="block text-stone-400">發證機構</span>
                <span className="font-bold text-amber-900 font-sans">創點子 IdeaX 競賽委員會</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-white border-t border-stone-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-colors cursor-pointer"
          >
            關閉
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>列印／匯出 PDF 證書</span>
          </button>
        </div>
      </div>
    </div>
  );
};

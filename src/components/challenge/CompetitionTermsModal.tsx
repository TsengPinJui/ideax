import React, { useState } from 'react';
import {
  X,
  BookOpen,
  FileText,
  UserCheck,
  ShieldCheck,
  HelpCircle,
  Sparkles,
  CheckCircle2,
  Calendar,
  Layers,
  Coins,
  Trophy,
  Flame,
  ArrowRight,
} from 'lucide-react';
import {
  COMPETITION_RULES_A,
  GENERAL_USER_TERMS_B,
  PARTICIPANT_TERMS_C,
  EXPERT_JUDGE_TERMS_D,
  PLATFORM_GUIDE_E,
  ALL_COMPETITION_DOCUMENTS,
} from '../../data/competitionTermsData';

export type CompetitionDocumentKey = 'A' | 'B' | 'C' | 'D' | 'E';

interface CompetitionTermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDoc?: CompetitionDocumentKey;
}

export const CompetitionTermsModal: React.FC<CompetitionTermsModalProps> = ({
  isOpen,
  onClose,
  initialDoc = 'A',
}) => {
  const [activeDoc, setActiveDoc] = useState<CompetitionDocumentKey>(initialDoc);

  if (!isOpen) return null;

  const tabs: Array<{ key: CompetitionDocumentKey; label: string; icon: any; shortTitle: string }> = [
    { key: 'A', label: 'A. 競賽辦法', icon: BookOpen, shortTitle: '官方競賽規章' },
    { key: 'B', label: 'B. 一般用戶條款', icon: FileText, shortTitle: '會員注資守則' },
    { key: 'C', label: 'C. 參賽者條款', icon: UserCheck, shortTitle: '團隊提案規約' },
    { key: 'D', label: 'D. 專家評審條款', icon: ShieldCheck, shortTitle: '專家保密與評審' },
    { key: 'E', label: 'E. 平台使用方法', icon: HelpCircle, shortTitle: '實戰操作全指南' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white border border-amber-300 rounded-3xl max-w-3xl w-full p-5 sm:p-6 space-y-4 my-8 max-h-[90vh] overflow-y-auto shadow-2xl text-stone-900 flex flex-col justify-between">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            <img src="/logo-bulb.png" alt="IdeaX" className="w-5 h-5 object-contain shrink-0" />
            <img src="/logo-chuangxingji-text.png" alt="創星季" className="h-5 w-auto object-contain shrink-0" />
            <span className="text-stone-300 font-bold hidden sm:inline">|</span>
            <h3 className="text-sm sm:text-base font-black text-stone-900">
              IdeaX 創星季 • 規章條款與使用手冊
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
            title="關閉"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 5-Tab Header */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1 bg-stone-100 rounded-2xl">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeDoc === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveDoc(tab.key)}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer select-none ${
                  isActive
                    ? 'bg-amber-400 text-stone-950 shadow-xs font-black'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
                }`}
              >
                <div className="flex items-center gap-1">
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{tab.label}</span>
                </div>
                <span className={`text-[10px] hidden sm:block ${isActive ? 'text-stone-900' : 'text-stone-400'}`}>
                  {tab.shortTitle}
                </span>
              </button>
            );
          })}
        </div>

        {/* Content Area - 商用正式規章白底黑字連續文件規格 */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {activeDoc === 'A' && (
            <div className="bg-white border border-stone-200 rounded-xl p-6 sm:p-8 text-stone-900 shadow-2xs space-y-6">
              <div className="border-b border-stone-200 pb-4">
                <h3 className="text-base sm:text-lg font-black text-stone-950">
                  {COMPETITION_RULES_A.title}
                </h3>
                <p className="text-xs text-stone-600 mt-1">{COMPETITION_RULES_A.subtitle}</p>
                <div className="text-[11px] font-mono text-stone-500 mt-2">
                  最後修訂日：{COMPETITION_RULES_A.lastUpdated} • 主辦單位：IdeaX 團隊
                </div>
              </div>

              <div className="space-y-6 text-xs text-stone-800 leading-relaxed">
                {COMPETITION_RULES_A.sections.map((sec) => (
                  <div key={sec.id} className="space-y-2">
                    <h4 className="font-black text-stone-950 text-sm border-b border-stone-200 pb-1">
                      {sec.title}
                    </h4>
                    {sec.summary && (
                      <p className="text-stone-500 font-medium text-[11px]">{sec.summary}</p>
                    )}
                    <div className="space-y-1 text-stone-700 pl-0 sm:pl-1">
                      {sec.content.map((para, i) => (
                        <p key={i}>{para}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeDoc === 'B' && (
            <div className="bg-white border border-stone-200 rounded-xl p-6 sm:p-8 text-stone-900 shadow-2xs space-y-6">
              <div className="border-b border-stone-200 pb-4">
                <h3 className="text-base sm:text-lg font-black text-stone-950">
                  {GENERAL_USER_TERMS_B.title}
                </h3>
                <p className="text-xs text-stone-600 mt-1">{GENERAL_USER_TERMS_B.subtitle}</p>
                <div className="text-[11px] font-mono text-stone-500 mt-2">
                  適用範圍：競賽網站全體會員登入、註冊與創星幣注資
                </div>
              </div>

              <div className="space-y-6 text-xs text-stone-800 leading-relaxed">
                {GENERAL_USER_TERMS_B.sections.map((sec) => (
                  <div key={sec.id} className="space-y-2">
                    <h4 className="font-black text-stone-950 text-sm border-b border-stone-200 pb-1">
                      {sec.title}
                    </h4>
                    {sec.summary && (
                      <p className="text-stone-500 font-medium text-[11px]">{sec.summary}</p>
                    )}
                    <div className="space-y-1 text-stone-700 pl-0 sm:pl-1">
                      {sec.content.map((para, i) => (
                        <p key={i}>{para}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeDoc === 'C' && (
            <div className="bg-white border border-stone-200 rounded-xl p-6 sm:p-8 text-stone-900 shadow-2xs space-y-6">
              <div className="border-b border-stone-200 pb-4">
                <h3 className="text-base sm:text-lg font-black text-stone-950">
                  {PARTICIPANT_TERMS_C.title}
                </h3>
                <p className="text-xs text-stone-600 mt-1">{PARTICIPANT_TERMS_C.subtitle}</p>
                <div className="text-[11px] font-mono text-stone-500 mt-2">
                  適用範圍：申請成為參賽者、提案投件與決賽資格
                </div>
              </div>

              <div className="space-y-6 text-xs text-stone-800 leading-relaxed">
                {PARTICIPANT_TERMS_C.sections.map((sec) => (
                  <div key={sec.id} className="space-y-2">
                    <h4 className="font-black text-stone-950 text-sm border-b border-stone-200 pb-1">
                      {sec.title}
                    </h4>
                    {sec.summary && (
                      <p className="text-stone-500 font-medium text-[11px]">{sec.summary}</p>
                    )}
                    <div className="space-y-1 text-stone-700 pl-0 sm:pl-1">
                      {sec.content.map((para, i) => (
                        <p key={i}>{para}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeDoc === 'D' && (
            <div className="bg-white border border-stone-200 rounded-xl p-6 sm:p-8 text-stone-900 shadow-2xs space-y-6">
              <div className="border-b border-stone-200 pb-4">
                <h3 className="text-base sm:text-lg font-black text-stone-950">
                  {EXPERT_JUDGE_TERMS_D.title}
                </h3>
                <p className="text-xs text-stone-600 mt-1">{EXPERT_JUDGE_TERMS_D.subtitle}</p>
                <div className="text-[11px] font-mono text-stone-500 mt-2">
                  適用範圍：專家申請、保密協議（NDA）與決選評審
                </div>
              </div>

              <div className="space-y-6 text-xs text-stone-800 leading-relaxed">
                {EXPERT_JUDGE_TERMS_D.sections.map((sec) => (
                  <div key={sec.id} className="space-y-2">
                    <h4 className="font-black text-stone-950 text-sm border-b border-stone-200 pb-1">
                      {sec.title}
                    </h4>
                    {sec.summary && (
                      <p className="text-stone-500 font-medium text-[11px]">{sec.summary}</p>
                    )}
                    <div className="space-y-1 text-stone-700 pl-0 sm:pl-1">
                      {sec.content.map((para, i) => (
                        <p key={i}>{para}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeDoc === 'E' && (
            <div className="bg-white border border-stone-200 rounded-xl p-6 sm:p-8 text-stone-900 shadow-2xs space-y-6">
              <div className="border-b border-stone-200 pb-4">
                <h3 className="text-base sm:text-lg font-black text-stone-950">
                  {PLATFORM_GUIDE_E.title}
                </h3>
                <p className="text-xs text-stone-600 mt-1">{PLATFORM_GUIDE_E.subtitle}</p>
                <div className="text-[11px] font-mono text-stone-500 mt-2">
                  快速上手指南：7 大實戰操作步驟
                </div>
              </div>

              <div className="space-y-6 text-xs text-stone-800 leading-relaxed">
                {PLATFORM_GUIDE_E.steps.map((step) => (
                  <div key={step.stepNumber} className="space-y-2">
                    <h4 className="font-black text-stone-950 text-sm border-b border-stone-200 pb-1 flex items-center justify-between">
                      <span>步驟 {step.stepNumber}：{step.title}</span>
                      <span className="text-[11px] font-normal text-stone-500">{step.badge}</span>
                    </h4>
                    <p className="text-stone-700">{step.description}</p>
                    <p className="text-stone-500 text-[11px]">提示：{step.tips}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-stone-500 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>IdeaX 官方認證規章條款</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs cursor-pointer shadow-xs"
          >
            我已瞭解並關閉
          </button>
        </div>
      </div>
    </div>
  );
};

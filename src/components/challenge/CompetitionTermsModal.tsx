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

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {activeDoc === 'A' && (
            <div className="space-y-4">
              <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-200">
                <div className="flex items-center gap-2 text-amber-900 font-black text-sm">
                  <BookOpen className="w-4 h-4 text-amber-600" />
                  <span>{COMPETITION_RULES_A.title}</span>
                </div>
                <p className="text-xs text-amber-800 mt-1">{COMPETITION_RULES_A.subtitle}</p>
                <span className="text-[10px] font-mono text-stone-400 mt-2 block">
                  最後修訂日：{COMPETITION_RULES_A.lastUpdated}
                </span>
              </div>

              <div className="space-y-3 text-xs">
                {COMPETITION_RULES_A.sections.map((sec) => (
                  <div key={sec.id} className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-stone-900 text-sm">{sec.title}</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                        {sec.badge}
                      </span>
                    </div>
                    <p className="text-stone-500 font-bold text-[11px]">{sec.summary}</p>
                    <div className="space-y-1.5 text-stone-700 leading-relaxed pt-1">
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
            <div className="space-y-4">
              <div className="bg-emerald-50/80 p-4 rounded-2xl border border-emerald-200">
                <div className="flex items-center gap-2 text-emerald-950 font-black text-sm">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>{GENERAL_USER_TERMS_B.title}</span>
                </div>
                <p className="text-xs text-emerald-800 mt-1">{GENERAL_USER_TERMS_B.subtitle}</p>
                <span className="text-[10px] font-mono text-stone-400 mt-2 block">
                  適用範圍：競賽網站全體會員登入、註冊與創星幣注資
                </span>
              </div>

              <div className="space-y-3 text-xs">
                {GENERAL_USER_TERMS_B.sections.map((sec) => (
                  <div key={sec.id} className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-stone-900 text-sm">{sec.title}</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {sec.badge}
                      </span>
                    </div>
                    <p className="text-stone-500 font-bold text-[11px]">{sec.summary}</p>
                    <div className="space-y-1.5 text-stone-700 leading-relaxed pt-1">
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
            <div className="space-y-4">
              <div className="bg-blue-50/80 p-4 rounded-2xl border border-blue-200">
                <div className="flex items-center gap-2 text-blue-950 font-black text-sm">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  <span>{PARTICIPANT_TERMS_C.title}</span>
                </div>
                <p className="text-xs text-blue-800 mt-1">{PARTICIPANT_TERMS_C.subtitle}</p>
                <span className="text-[10px] font-mono text-stone-400 mt-2 block">
                  適用範圍：申請成為參賽者、提案投件與決賽資格
                </span>
              </div>

              <div className="space-y-3 text-xs">
                {PARTICIPANT_TERMS_C.sections.map((sec) => (
                  <div key={sec.id} className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-stone-900 text-sm">{sec.title}</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                        {sec.badge}
                      </span>
                    </div>
                    <p className="text-stone-500 font-bold text-[11px]">{sec.summary}</p>
                    <div className="space-y-1.5 text-stone-700 leading-relaxed pt-1">
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
            <div className="space-y-4">
              <div className="bg-purple-50/80 p-4 rounded-2xl border border-purple-200">
                <div className="flex items-center gap-2 text-purple-950 font-black text-sm">
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  <span>{EXPERT_JUDGE_TERMS_D.title}</span>
                </div>
                <p className="text-xs text-purple-800 mt-1">{EXPERT_JUDGE_TERMS_D.subtitle}</p>
                <span className="text-[10px] font-mono text-stone-400 mt-2 block">
                  適用範圍：專家申請、保密協議（NDA）與決選評審
                </span>
              </div>

              <div className="space-y-3 text-xs">
                {EXPERT_JUDGE_TERMS_D.sections.map((sec) => (
                  <div key={sec.id} className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-stone-900 text-sm">{sec.title}</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                        {sec.badge}
                      </span>
                    </div>
                    <p className="text-stone-500 font-bold text-[11px]">{sec.summary}</p>
                    <div className="space-y-1.5 text-stone-700 leading-relaxed pt-1">
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
            <div className="space-y-4">
              <div className="bg-yellow-50/80 p-4 rounded-2xl border border-yellow-200">
                <div className="flex items-center gap-2 text-yellow-950 font-black text-sm">
                  <HelpCircle className="w-4 h-4 text-yellow-600" />
                  <span>{PLATFORM_GUIDE_E.title}</span>
                </div>
                <p className="text-xs text-yellow-800 mt-1">{PLATFORM_GUIDE_E.subtitle}</p>
                <span className="text-[10px] font-mono text-stone-400 mt-2 block">
                  快速上手指南：7 大實戰操作步驟
                </span>
              </div>

              <div className="space-y-3 text-xs">
                {PLATFORM_GUIDE_E.steps.map((step) => (
                  <div key={step.stepNumber} className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-amber-400 text-stone-950 font-black text-xs flex items-center justify-center font-mono">
                          {step.stepNumber}
                        </span>
                        <h4 className="font-black text-stone-900 text-sm">{step.title}</h4>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-200 text-stone-700">
                        {step.badge}
                      </span>
                    </div>
                    <p className="text-stone-700 leading-relaxed pt-0.5">{step.description}</p>
                    <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-[11px] text-amber-900 font-bold">
                      💡 實戰小撇步：{step.tips}
                    </div>
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

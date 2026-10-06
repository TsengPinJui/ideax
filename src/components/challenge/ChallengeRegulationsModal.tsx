import React, { useState } from 'react';
import {
  X,
  BookOpen,
  ShieldCheck,
  Award,
  Coins,
  CheckCircle2,
  Calendar,
  Users,
  FileText,
  AlertCircle,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { CHALLENGE_CONSTANTS } from '../../data/challengeData';
import { TERMS_DATA } from '../../data/termsData';

interface ChallengeRegulationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'regulations' | 'participant_terms' | 'expert_terms' | 'faq';
  onOpenSubmit?: () => void;
}

export const ChallengeRegulationsModal: React.FC<ChallengeRegulationsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'regulations',
  onOpenSubmit,
}) => {
  const [activeTab, setActiveTab] = useState<'regulations' | 'participant_terms' | 'expert_terms' | 'faq'>(
    initialTab
  );

  if (!isOpen) return null;

  const challengeRegulations = TERMS_DATA['challenge_regulations'];
  const participantTerms = TERMS_DATA['challenge_participant_terms'];
  const expertTerms = TERMS_DATA['challenge_expert_terms'];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-stone-200 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 my-auto overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-stone-100 flex items-center justify-between bg-gradient-to-r from-amber-50/70 via-stone-50 to-emerald-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-stone-950 flex items-center justify-center font-black shadow-xs shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-stone-900">
                  IdeaX 創星季 • 競賽辦法與規章
                </h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  官方正本
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                主辦單位：IdeaX創點子團隊 • 賽程四階段、虛擬募資規範與參賽條款
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl border border-stone-200 hover:bg-stone-100 flex items-center justify-center text-stone-500 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-4 sm:px-6 pt-3 border-b border-stone-200 flex gap-2 overflow-x-auto scrollbar-none bg-stone-50/60 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('regulations')}
            className={`pb-2.5 px-3 text-xs font-black transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'regulations'
                ? 'border-amber-500 text-amber-950 bg-white rounded-t-xl'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>創星季競賽辦法</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('participant_terms')}
            className={`pb-2.5 px-3 text-xs font-black transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'participant_terms'
                ? 'border-emerald-600 text-emerald-950 bg-white rounded-t-xl'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>參賽規則與智財條款</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('expert_terms')}
            className={`pb-2.5 px-3 text-xs font-black transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'expert_terms'
                ? 'border-purple-600 text-purple-950 bg-white rounded-t-xl'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>特聘專家與指導條款</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('faq')}
            className={`pb-2.5 px-3 text-xs font-black transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'faq'
                ? 'border-blue-600 text-blue-950 bg-white rounded-t-xl'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>常見問題 FAQ</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-stone-800 text-xs sm:text-sm leading-relaxed">
          {/* TAB 1: 競賽辦法 */}
          {activeTab === 'regulations' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Highlight summary banner */}
              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="font-black text-amber-950 text-xs">
                    主辦單位公告 • 競賽重要原則摘要
                  </span>
                </div>
                <p className="text-xs text-stone-700 leading-relaxed">
                  IdeaX 創星季由 <strong>IdeaX 創點子團隊</strong> 全權主辦。全賽程採「<strong>真實盲測＋虛擬募資驗證＋特聘專家點評</strong>」，點數與主站點數與金流完全隔離，不保證商轉，但提供真實驗證與官方唯一編號榮譽證明。
                </p>
              </div>

              {/* 核心條文清單 */}
              {challengeRegulations?.content ? (
                <div className="space-y-4">
                  {challengeRegulations.content.map((paragraph, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-2 text-stone-700 text-xs sm:text-[13px] leading-relaxed whitespace-pre-line"
                    >
                      {paragraph}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-stone-500">載入條文內容中...</p>
              )}
            </div>
          )}

          {/* TAB 2: 參賽規則與條款 */}
          {activeTab === 'participant_terms' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span className="font-black text-emerald-950 text-xs">
                    參賽者智慧財產權與權利義務承諾
                  </span>
                </div>
                <p className="text-xs text-stone-700 leading-relaxed">
                  <strong>智慧財產權 100% 完整歸屬原創參賽者</strong>。大會僅取得賽事評選、平台宣傳展示及榮譽榜刊登之非專屬授權。若出現相似提案，依「最早刊登時間者優先」原則處理。
                </p>
              </div>

              {participantTerms?.content ? (
                <div className="space-y-4">
                  {participantTerms.content.map((paragraph, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-2 text-stone-700 text-xs sm:text-[13px] leading-relaxed whitespace-pre-line"
                    >
                      {paragraph}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-stone-500">載入參賽條款中...</p>
              )}
            </div>
          )}

          {/* TAB 3: 專家條款 */}
          {activeTab === 'expert_terms' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-purple-50/80 border border-purple-200 space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-purple-700" />
                  <span className="font-black text-purple-950 text-xs">
                    成為專家資歷核驗與評審操守要求
                  </span>
                </div>
                <p className="text-xs text-stone-700 leading-relaxed">
                  成為專家<strong>必須上傳相關證明或專業證件</strong>（如名片、專業執照、在職證明或獲獎作品）。獲配之 300 萬點專屬評審額度具客觀嚴謹性，嚴禁利益交換或圖利關係人。
                </p>
              </div>

              {expertTerms?.content ? (
                <div className="space-y-4">
                  {expertTerms.content.map((paragraph, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-2 text-stone-700 text-xs sm:text-[13px] leading-relaxed whitespace-pre-line"
                    >
                      {paragraph}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-stone-500">載入專家條款中...</p>
              )}
            </div>
          )}

          {/* TAB 4: 常見問題 FAQ */}
          {activeTab === 'faq' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-1.5">
                <h4 className="font-black text-stone-900 text-xs sm:text-sm">
                  Q1: 參加 IdeaX 創星季需要支付任何報名費用嗎？
                </h4>
                <p className="text-xs text-stone-600 leading-relaxed">
                  A: 完全免費！IdeaX 創星季為零門檻創新挑戰賽，註冊參賽者即可免費提交提案，並免費獲配 10 萬點虛擬支持點數進行全站盲測。
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-1.5">
                <h4 className="font-black text-stone-900 text-xs sm:text-sm">
                  Q2: 虛擬募資點數可以兌換成新台幣現金嗎？
                </h4>
                <p className="text-xs text-stone-600 leading-relaxed">
                  A: 絕對不可。競賽專用虛擬點數（1點=NT$1）僅作為市場支持度度量衡與排位權重之用，與主站點數及任何實體法定貨幣完全隔離，不可購買、不可兌現、不可轉帳。
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-1.5">
                <h4 className="font-black text-stone-900 text-xs sm:text-sm">
                  Q3: 推廣大使推廣費如何領取？
                </h4>
                <p className="text-xs text-stone-600 leading-relaxed">
                  A: 推廣大使每成功推薦一位創作者且其「提案審核通過」，大會即發放 <strong>NT$ 400 元</strong> 實體推廣費（只按推薦且過審計算，投稿者本人不領取此款）。
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-1.5">
                <h4 className="font-black text-stone-900 text-xs sm:text-sm">
                  Q4: 申請成為特聘專家需要什麼資格與證明？
                </h4>
                <p className="text-xs text-stone-600 leading-relaxed">
                  A: 申請成為專家<strong>需要求上傳相關證明或專業證件</strong>（如名片、專業執照、在職證明、作品集或獲獎證書等），通過大會審核後即配發 300 萬點專屬支持金池，並受邀為參賽專案進行深度點評。
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-stone-200 bg-stone-50 flex items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-stone-500">
            最新版本生效日：2026 年 11 月 01 日 • IdeaX 創點子團隊
          </div>

          <div className="flex items-center gap-2">
            {onOpenSubmit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSubmit();
                }}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs cursor-pointer shadow-xs"
              >
                立即投稿提案
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold text-xs cursor-pointer"
            >
              關閉
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

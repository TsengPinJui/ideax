import React, { useState } from 'react';
import { TERMS_DATA, TermItem } from '../data/termsData';
import { AboutSection } from '../types';
import { Sparkles, ShieldCheck, FileText, ArrowLeft, BookOpen, HeartHandshake, CheckCircle2 } from 'lucide-react';

interface AboutUsViewProps {
  initialSection?: AboutSection;
  onBack?: () => void;
  isModal?: boolean;
  onStartOnboarding?: () => void;
}

export const AboutUsView: React.FC<AboutUsViewProps> = ({
  initialSection = 'about_ideax',
  onBack,
  isModal,
  onStartOnboarding,
}) => {
  const [activeKey, setActiveKey] = useState<string>(() => {
    if (initialSection && initialSection !== 'list' && TERMS_DATA[initialSection]) {
      return initialSection;
    }
    return 'about_ideax';
  });

  const currentTerm: TermItem = TERMS_DATA[activeKey] || TERMS_DATA.about_ideax;

  // If showing full terms view (anything other than intro overview if requested)
  if (activeKey !== 'about_ideax' && currentTerm) {
    return (
      <div className="max-w-4xl mx-auto py-4 px-2 sm:px-4 space-y-6 animate-in fade-in">
        {/* Navigation & Title */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveKey('about_ideax')}
              className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-600 transition-colors flex items-center gap-1 text-xs font-bold cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>返回簡介</span>
            </button>
            <span className="text-stone-300">/</span>
            <span className="text-xs font-black text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
              {currentTerm.badge}
            </span>
          </div>

          <span className="text-[11px] text-stone-400 font-mono">
            版本：{currentTerm.version} • {currentTerm.updatedAt}
          </span>
        </div>

        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-amber-600 shrink-0" />
            <span>{currentTerm.title}</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 font-medium">
            {currentTerm.subtitle}
          </p>
          <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-950 leading-relaxed font-medium">
            💡 <strong>重點摘要：</strong>{currentTerm.summary}
          </div>
        </div>

        {/* Clauses List */}
        <div className="space-y-4 pt-2">
          {currentTerm.content.map((clause, idx) => (
            <div
              key={idx}
              className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-2 leading-relaxed text-xs sm:text-sm text-stone-700 whitespace-pre-wrap"
            >
              {clause}
            </div>
          ))}
        </div>

        {/* Footer Note */}
        <div className="pt-4 text-center text-xs text-stone-400 border-t border-stone-100">
          © 2026 IdeaX 創點子團隊. 版權所有，非經授權請勿轉載。
        </div>
      </div>
    );
  }

  const about = TERMS_DATA.about_ideax;

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-10 animate-in fade-in">
      {/* Hero Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <span className="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-800 border border-amber-300">
          <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-600 animate-pulse" />
          全台最具實戰力的新型態商業智庫與創新挑戰
        </span>
        <h1 className="text-2xl sm:text-4xl font-black text-stone-900 tracking-tight leading-tight">
          一個問題，找到更多可能
        </h1>
        <p className="text-sm sm:text-base text-stone-600 leading-relaxed">
          打破傳統顧問產業資訊黑盒子，讓真實世界中的創業難題與民間高手、實戰專家的落地智慧精準對接。
        </p>
      </div>

      {/* Quick Terms Directory */}
      <div className="p-5 rounded-3xl bg-stone-50 border border-stone-200 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-stone-800 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-amber-600" />
            <span>重要服務條款與賽事實施辦法規範庫</span>
          </span>
          <span className="text-[10px] text-stone-400">點擊即可閱讀完整章程</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={() => setActiveKey('challenge_regulations')}
            className="p-3 rounded-2xl bg-emerald-50/90 border border-emerald-300 text-left hover:bg-emerald-100/80 transition-all cursor-pointer group"
          >
            <div className="text-[10px] font-black text-emerald-800 px-2 py-0.5 rounded-md bg-emerald-200/80 inline-block mb-1">
              新站核心規章
            </div>
            <div className="text-xs font-black text-emerald-950 group-hover:text-emerald-800">
              《創星季競賽辦法與規章》
            </div>
            <div className="text-[10px] text-emerald-700 mt-0.5 line-clamp-1">
              賽事規程、雙站互通與300萬支持金
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveKey('challenge_participant_terms')}
            className="p-3 rounded-2xl bg-emerald-50/90 border border-emerald-300 text-left hover:bg-emerald-100/80 transition-all cursor-pointer group"
          >
            <div className="text-[10px] font-black text-emerald-800 px-2 py-0.5 rounded-md bg-emerald-200/80 inline-block mb-1">
              參賽者專屬
            </div>
            <div className="text-xs font-black text-emerald-950 group-hover:text-emerald-800">
              《創星季參賽者規則與智財條款》
            </div>
            <div className="text-[10px] text-emerald-700 mt-0.5 line-clamp-1">
              原創擔保、智財不移轉與展示授權
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveKey('challenge_expert_terms')}
            className="p-3 rounded-2xl bg-emerald-50/90 border border-emerald-300 text-left hover:bg-emerald-100/80 transition-all cursor-pointer group"
          >
            <div className="text-[10px] font-black text-emerald-800 px-2 py-0.5 rounded-md bg-emerald-200/80 inline-block mb-1">
              特聘專家專屬
            </div>
            <div className="text-xs font-black text-emerald-950 group-hover:text-emerald-800">
              《創星季特聘評審與專家指導條款》
            </div>
            <div className="text-[10px] text-emerald-700 mt-0.5 line-clamp-1">
              專業證件審核、客觀評選與利益迴避
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveKey('general_terms')}
            className="p-3 rounded-2xl bg-white border border-stone-200 text-left hover:bg-amber-50/60 hover:border-amber-300 transition-all cursor-pointer group"
          >
            <div className="text-[10px] font-black text-stone-600 px-2 py-0.5 rounded-md bg-stone-100 inline-block mb-1">
              全站通用
            </div>
            <div className="text-xs font-black text-stone-900 group-hover:text-amber-800">
              《一般服務條款》
            </div>
            <div className="text-[10px] text-stone-500 mt-0.5 line-clamp-1">
              基礎用戶權利、隱私政策與免責聲明
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveKey('solver_terms')}
            className="p-3 rounded-2xl bg-white border border-stone-200 text-left hover:bg-amber-50/60 hover:border-amber-300 transition-all cursor-pointer group"
          >
            <div className="text-[10px] font-black text-stone-600 px-2 py-0.5 rounded-md bg-stone-100 inline-block mb-1">
              舊站接案
            </div>
            <div className="text-xs font-black text-stone-900 group-hover:text-amber-800">
              《舊站專家解題與隊友服務條款》
            </div>
            <div className="text-[10px] text-stone-500 mt-0.5 line-clamp-1">
              解答者獨立執業、金流拆款與保密協定
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveKey('recharge_subscription_terms')}
            className="p-3 rounded-2xl bg-white border border-stone-200 text-left hover:bg-amber-50/60 hover:border-amber-300 transition-all cursor-pointer group"
          >
            <div className="text-[10px] font-black text-stone-600 px-2 py-0.5 rounded-md bg-stone-100 inline-block mb-1">
              金流規範
            </div>
            <div className="text-xs font-black text-stone-900 group-hover:text-amber-800">
              《點數儲值與會員訂閱條款》
            </div>
            <div className="text-[10px] text-stone-500 mt-0.5 line-clamp-1">
              第三方代管、點數使用與鑑賞期聲明
            </div>
          </button>
        </div>
      </div>

      {/* 3 Core Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-5 rounded-3xl bg-white border border-stone-200 shadow-2xs space-y-2.5">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-black text-lg">
            🆓
          </div>
          <h3 className="text-base font-black text-stone-900">痛點免費提出 (NT$ 0)</h3>
          <p className="text-xs text-stone-600 leading-relaxed">
            降低發案資金門檻，創業者可免費上架痛點，專家自訂解鎖金額，創造長期知識變現。
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-stone-200 shadow-2xs space-y-2.5">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-black text-lg">
            🎯
          </div>
          <h3 className="text-base font-black text-stone-900">分級懸賞 (L0 ~ L4)</h3>
          <p className="text-xs text-stone-600 leading-relaxed">
            從社群免費閒聊激盪，到企業級 L4 旗艦顧問委託，滿足個人與中大型企業多樣化需求。
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-stone-200 shadow-2xs space-y-2.5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-lg">
            🛡️
          </div>
          <h3 className="text-base font-black text-stone-900">第三方價金獨立託管</h3>
          <p className="text-xs text-stone-600 leading-relaxed">
            款項安全託管於金管會核准之第三方支付，確認驗收後自動拆款撥付實名銀行帳戶。
          </p>
        </div>
      </div>

      {/* Mission Content from TermsData */}
      {about && (
        <div className="p-6 sm:p-8 rounded-3xl bg-stone-900 text-white space-y-5">
          <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs">
            <HeartHandshake className="w-4 h-4" />
            <span>創點子 IdeaX 品牌理念與營運願景</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">{about.title}</h2>
          <div className="space-y-3.5 text-stone-300 text-xs sm:text-sm leading-relaxed">
            {about.content.map((p, idx) => (
              <div key={idx} className="bg-stone-800/70 p-4 rounded-2xl border border-stone-700/60 whitespace-pre-wrap">
                {p}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

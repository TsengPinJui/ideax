import React from 'react';
import { TERMS_DATA } from '../data/termsData';
import { AboutSection } from '../types';
import { Sparkles, ShieldCheck, Target, Users, Zap, HeartHandshake } from 'lucide-react';

interface AboutUsViewProps {
  initialSection?: AboutSection | string;
  onBack?: () => void;
  isModal?: boolean;
  onStartOnboarding?: () => void;
}

export const AboutUsView: React.FC<AboutUsViewProps> = () => {
  const about = TERMS_DATA.about_ideax;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-12">
      {/* Hero Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <span className="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
          <Sparkles className="w-3.5 h-3.5 mr-1 text-indigo-600 animate-pulse" />
          全台最具實戰力的新型態商業智庫
        </span>
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
          一個問題，找到更多可能
        </h1>
        <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
          打破傳統顧問產業資訊黑盒子，讓真實世界中的創業難題與民間高手、實戰專家的落地智慧精準對接。
        </p>
      </div>

      {/* 3 Core Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xl">
            🆓
          </div>
          <h3 className="text-lg font-black text-slate-900">痛點免費提出 (NT$ 0)</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            降低發案資金門檻，創業者可免費上架痛點，專家自訂解鎖金額，創造長期知識變現。
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-black text-xl">
            🎯
          </div>
          <h3 className="text-lg font-black text-slate-900">分級懸賞 (L0 ~ L4)</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            從社群免費閒聊激盪，到企業級 L4 旗艦顧問委託，滿足個人與中大型企業多樣化需求。
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-xl">
            🛡️
          </div>
          <h3 className="text-lg font-black text-slate-900">第三方價金獨立託管</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            款項安全託管於金管會核准之第三方支付，確認驗收後自動拆款撥付實名銀行帳戶。
          </p>
        </div>
      </div>

      {/* Mission Content from TermsData */}
      {about && (
        <div className="p-8 rounded-3xl bg-slate-900 text-white space-y-6">
          <div className="flex items-center space-x-2 text-indigo-400 font-bold text-xs">
            <HeartHandshake className="w-4 h-4" />
            <span>創點子 IdeaX 品牌理念</span>
          </div>
          <h2 className="text-2xl font-black text-white">{about.title}</h2>
          <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
            {about.content.map((p, idx) => (
              <div key={idx} className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/50 whitespace-pre-wrap">
                {p}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { TERMS_DATA, TermItem } from '../data/termsData';
import { BookOpen, Shield, HelpCircle, FileText, CheckCircle2 } from 'lucide-react';

const MECHANISM_ARTICLES = [
  {
    id: 'mech-1',
    badge: '雙軌驗證',
    title: '真實盲測與市場支持度評估',
    summary: '提供 10 萬點虛擬支持池進行無門檻概念盲測，由大眾與專業社群共同檢驗商業可行性。',
  },
  {
    id: 'mech-2',
    badge: '專屬支持池',
    title: '特聘專家顧問評估與注資機制',
    summary: '各界架構師與創投顧問配賦專屬 300 萬點支持金池，針對優質提案進行深度指導。',
  },
  {
    id: 'mech-3',
    badge: '官方數位證明',
    title: '唯一序號認證證書與推廣大使',
    summary: '過審專案即刻獲發官方金色榮譽數位證書；推廣大使每推薦一件過審提案獲 NT$ 400 推廣費。',
  },
];

export const MechanismView: React.FC = () => {
  const [selectedTermKey, setSelectedTermKey] = useState<string>('general_terms');
  const [activeCategory, setActiveCategory] = useState<'all' | 'general' | 'solver' | 'questioner' | 'statement' | 'challenge'>('all');

  const allTerms = Object.values(TERMS_DATA);
  const filteredTerms = activeCategory === 'all' 
    ? allTerms 
    : allTerms.filter((t) => t.category === activeCategory);

  const currentTerm: TermItem = TERMS_DATA[selectedTermKey] || TERMS_DATA.general_terms;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Page Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center justify-center">
          <BookOpen className="w-8 h-8 mr-2 text-indigo-600 inline" />
          平台運作機制與服務條款規範庫
        </h1>
        <p className="text-sm text-slate-600">
          全站公開透明之法律條款、定型化契約、隱私保護與智慧財產權授權規章（版本 {currentTerm.version}）
        </p>
      </div>

      {/* Mechanism Articles Quick Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {MECHANISM_ARTICLES.map((article) => (
          <div key={article.id} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              {article.badge}
            </span>
            <h3 className="text-sm font-bold text-slate-900">{article.title}</h3>
            <p className="text-xs text-slate-600 line-clamp-2">{article.summary}</p>
          </div>
        ))}
      </div>

      {/* Main Layout: Left Sidebar + Right Document Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Term List Navigation */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 p-4 shadow-sm space-y-3">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">
            條款與政策類別
          </div>

          <div className="flex flex-wrap gap-1 p-1 bg-slate-100 rounded-xl">
            {(['all', 'general', 'challenge', 'solver', 'questioner', 'statement'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                  activeCategory === cat
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat === 'all' ? '全部' : cat === 'general' ? '通用' : cat === 'challenge' ? '創星季' : cat === 'solver' ? '接案' : cat === 'questioner' ? '提問' : '聲明'}
              </button>
            ))}
          </div>

          <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
            {filteredTerms.map((term) => (
              <button
                key={term.id}
                onClick={() => setSelectedTermKey(term.id)}
                className={`w-full text-left p-3 rounded-2xl border transition-all ${
                  selectedTermKey === term.id
                    ? 'bg-indigo-50/80 border-indigo-300 text-indigo-950 shadow-sm'
                    : 'bg-white border-transparent hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold line-clamp-1">{term.title}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">
                    {term.badge}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                  {term.subtitle}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Document Display */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-5">
            <div className="flex items-center space-x-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100">
                {currentTerm.badge}
              </span>
              <span className="text-xs text-slate-400">版本：{currentTerm.version}</span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs text-slate-400">更新於：{currentTerm.updatedAt}</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900">{currentTerm.title}</h2>
            <p className="text-xs text-slate-500 mt-1">{currentTerm.subtitle}</p>
          </div>

          <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/60 text-xs text-indigo-950 leading-relaxed font-medium">
            💡 <span className="font-bold">規範摘要：</span>
            {currentTerm.summary}
          </div>

          <div className="space-y-4">
            {currentTerm.content.map((clause, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-medium"
              >
                {clause}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

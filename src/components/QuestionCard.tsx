import React from 'react';
import { Question } from '../types';
import { resolveUserAvatar, resolveUserName } from '../utils/userDisplay';
import { Clock, Eye, MessageSquare, Tag, Zap, ShieldCheck } from 'lucide-react';

interface QuestionCardProps {
  question: Question;
  onClick: () => void;
  solutionsCount?: number;
  discussionsCount?: number;
  viewMode?: any;
  onSelectCategory?: (cat: any, sub: any) => void;
  onSearchTag?: (tag: string) => void;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({ question, onClick }) => {
  const isPainPoint = question.bounty === 0;

  const levelBadgeColor: Record<string, string> = {
    L0: 'bg-slate-100 text-slate-700 border-slate-200',
    L1: 'bg-blue-50 text-blue-700 border-blue-200',
    L2: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    L3: 'bg-purple-50 text-purple-700 border-purple-200',
    L4: 'bg-amber-50 text-amber-800 border-amber-300 font-black',
  };

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border border-slate-200 hover:border-indigo-400 p-5 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between group relative overflow-hidden"
    >
      {/* Top Banner for High Bounty */}
      {question.bounty >= 100000 && (
        <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-orange-500 text-white text-[10px] font-black px-3 py-0.5 rounded-bl-lg tracking-wider flex items-center shadow-sm">
          <Zap className="w-3 h-3 mr-0.5 fill-current" />
          旗艦級重磅懸賞
        </div>
      )}

      <div>
        {/* Author / Metadata Row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2.5">
            <img
              src={resolveUserAvatar(question.authorAvatar, question.isAnonymous)}
              alt={resolveUserName(question.authorName, question.isAnonymous)}
              className="w-8 h-8 rounded-full object-cover border border-slate-200"
            />
            <div>
              <div className="text-xs font-bold text-slate-800 flex items-center">
                {resolveUserName(question.authorName, question.isAnonymous)}
                {question.isAnonymous && (
                  <span className="ml-1 text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                    匿名
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 flex items-center">
                <span>{question.category}</span>
                {question.subcategory && (
                  <>
                    <span className="mx-1">·</span>
                    <span>{question.subcategory}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Level Badge */}
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
              levelBadgeColor[question.level] || 'bg-slate-100 text-slate-700'
            }`}
          >
            {question.level} 級
          </span>
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 mb-2">
          {question.title}
        </h3>

        {/* Description */}
        <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed mb-4">
          {question.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {(question.tags || []).slice(0, 3).map((tag, idx) => (
            <span
              key={idx}
              className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600"
            >
              <Tag className="w-2.5 h-2.5 mr-1 text-slate-400" />
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Bottom Footer Row */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
        {/* Bounty Price Display */}
        <div>
          {isPainPoint ? (
            <div className="flex items-center space-x-1">
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                痛點提出 (NT$ 0)
              </span>
              <span className="text-[11px] text-slate-400">方案自訂解鎖</span>
            </div>
          ) : (
            <div className="text-left">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                第三方託管懸賞金
              </div>
              <div className="text-lg font-black text-indigo-600 tracking-tight">
                NT$ {question.bounty.toLocaleString()}
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center space-x-3 text-xs text-slate-400">
          <span className="flex items-center">
            <Eye className="w-3.5 h-3.5 mr-1" />
            {question.views}
          </span>
          <span className="flex items-center font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
            <MessageSquare className="w-3.5 h-3.5 mr-1" />
            {question.answersCount} 方案
          </span>
        </div>
      </div>
    </div>
  );
};

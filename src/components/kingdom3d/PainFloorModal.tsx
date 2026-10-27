import React from 'react';
import { X, PenLine, ChevronRight } from 'lucide-react';
import type { Question } from '../../types';
import { PAIN_FLOORS } from './stylized/painBoard';
import './kingdomUi.css';

export function isPainQuestion(q: Question) {
  return (q.postType === 'pain_point' || q.specialZone === 'pain_points') && !(q as any).isDelisted;
}

/** 某一層要展示的痛點（新到舊） */
export function painForFloor(questions: Question[], level: number) {
  const floor = PAIN_FLOORS[level] || PAIN_FLOORS[0];
  return questions
    .filter(isPainQuestion)
    .filter((q) => !floor.categories || floor.categories.includes(q.category))
    .sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0));
}

/** 創點樓：在某一層的懸賞牆前互動時，列出這層的痛點 */
export const PainFloorModal: React.FC<{
  open: boolean;
  level: number;
  questions: Question[];
  onClose: () => void;
  onOpenQuestion?: (q: Question) => void;
  onCreate?: () => void;
}> = ({ open, level, questions, onClose, onOpenQuestion, onCreate }) => {
  if (!open) return null;
  const floor = PAIN_FLOORS[level] || PAIN_FLOORS[0];
  const list = painForFloor(questions, level).slice(0, 40);
  return (
    <div className="kx-root fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/55 backdrop-blur-sm" onClick={onClose}>
      <div className="kx-panel kx-corners w-full max-w-xl max-h-[86vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3" style={{ borderBottom: '1px solid rgba(226,184,90,0.3)' }}>
          <div>
            <h3 className="kx-title text-xl sm:text-2xl">創點樓・{floor.label}</h3>
            <p className="kx-sub text-[13px] mt-0.5">{floor.sub}・共 {painForFloor(questions, level).length} 則</p>
          </div>
          <button type="button" onClick={onClose} className="kx-round w-9 h-9 shrink-0" aria-label="關閉">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {list.length === 0 ? (
            <p className="kx-sub text-[14px] text-center py-10">這層還沒有痛點，歡迎刊登第一則！</p>
          ) : (
            <ul className="space-y-1.5">
              {list.map((q) => (
                <li key={q.id}>
                  <button
                    type="button"
                    onClick={() => onOpenQuestion?.(q)}
                    className="w-full text-left rounded-lg px-3 py-2.5 flex items-center gap-3 cursor-pointer transition-colors hover:bg-[rgba(226,184,90,0.12)]"
                    style={{ background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(226,184,90,0.18)' }}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14.5px] truncate" style={{ color: '#f6e7c4' }}>
                        {q.title || '（未命名痛點）'}
                      </span>
                      <span className="kx-sub block text-[12px] mt-0.5">
                        {q.category}
                        {q.authorName ? `・${q.authorName}` : ''}
                      </span>
                    </span>
                    {q.bounty > 0 && (
                      <span className="shrink-0 text-[12.5px] tabular-nums" style={{ color: '#ffcf6a' }}>
                        懸賞 {q.bounty.toLocaleString()}
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 shrink-0 text-amber-200/70" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="px-5 py-3 flex items-center justify-between gap-2" style={{ borderTop: '1px solid rgba(226,184,90,0.3)' }}>
          <p className="kx-sub text-[12px]">沿兩側樓梯可以上下樓，各層展示不同分類</p>
          {onCreate && (
            <button type="button" onClick={onCreate} className="kx-btn-primary px-4 py-2 text-[13.5px] flex items-center gap-1.5 cursor-pointer shrink-0">
              <PenLine className="w-4 h-4" /> 刊登痛點
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

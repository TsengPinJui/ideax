import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Flame, Search, Check, X, Sparkles } from 'lucide-react';
import { Question } from '../types';
import { useApp } from '../context/AppContext';

interface PainPointAutocompleteInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  questions?: Question[];
}

export const PainPointAutocompleteInput: React.FC<PainPointAutocompleteInputProps> = ({
  value,
  onChange,
  placeholder = '輸入關鍵字搜尋公開痛點或自述痛點（例：P-102 或 早餐店備料痛點）',
  className = '',
  questions = [],
}) => {
  const appCtx = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeQuestions = useMemo(() => {
    const raw = questions && questions.length > 0 ? questions : (appCtx?.questions || []);
    return raw.filter((q) => Boolean(q && typeof q.id === 'string' && q.id.trim() && typeof q.title === 'string' && q.title.trim()));
  }, [questions, appCtx?.questions]);

  // 整理可供搜尋的公開痛點與全站問題清單
  const allPainPoints = useMemo(() => {
    const listFromQuestions = activeQuestions.map((q) => {
      const safeTitle = q.title || '';
      const safeId = q.id || '';
      return {
        id: safeId,
        title: safeTitle,
        category: q.category || '痛點洞察',
        isPainPoint:
          q.postType === 'pain_point' ||
          q.specialZone === 'pain_points' ||
          safeTitle.includes('痛點') ||
          (Array.isArray(q.tags) && q.tags.some((t) => typeof t === 'string' && t.includes('痛點'))),
      };
    }).filter((item) => item.isPainPoint);

    // 優先排列痛點標記對象
    const sortedQuestions = listFromQuestions.sort((a, b) => {
      if (a.isPainPoint && !b.isPainPoint) return -1;
      if (!a.isPainPoint && b.isPainPoint) return 1;
      return 0;
    });

    const seenIds = new Set<string>();
    const combined: typeof sortedQuestions = [];
    sortedQuestions.forEach((item) => {
      if (item.id && !seenIds.has(item.id)) {
        seenIds.add(item.id);
        combined.push(item);
      }
    });

    return combined;
  }, [activeQuestions]);

  // 依輸入內容動態搜尋匹配標題、序號與分類
  const filteredPainPoints = useMemo(() => {
    const term = (value || '').trim().toLowerCase();
    if (!term) return allPainPoints.slice(0, 8);

    return allPainPoints.filter(
      (p) =>
        (p.title || '').toLowerCase().includes(term) ||
        (p.id || '').toLowerCase().includes(term) ||
        String(p.category || '').toLowerCase().includes(term)
    );
  }, [value, allPainPoints]);

  // 點擊外部關閉下拉選單
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectPainPoint = (title: string, id: string) => {
    const formattedVal = `[${id}] ${title}`;
    onChange(formattedVal);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full space-y-1.5">
      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-stone-400 absolute left-3 pointer-events-none shrink-0" />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className={`w-full pl-9 pr-8 py-2.5 rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-stone-900 text-xs font-medium outline-none transition-all bg-white ${className}`}
        />
        {value ? (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-2.5 p-1 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 cursor-pointer"
            title="清除內容"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>

      {/* 搜尋下拉選單 (支援選取既有痛點與提案者自述輸入) */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 z-40 bg-white border border-stone-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 max-h-60 overflow-y-auto">
          {/* Header Note */}
          <div className="px-3.5 py-2 bg-stone-50 border-b border-stone-100 flex items-center justify-between text-[11px] text-stone-500 font-bold">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>自動匹配痛點（可點選引用或保持自述內容）</span>
            </span>
            <span>{filteredPainPoints.length} 筆符合</span>
          </div>

          <div className="p-1 space-y-0.5">
            {/* 提案者自述選項 */}
            {value.trim() && (
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-full text-left p-2.5 rounded-xl hover:bg-amber-50 text-amber-900 font-bold text-xs flex items-center justify-between transition-colors border border-dashed border-amber-300 my-0.5 cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <Flame className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="truncate">使用提案者自述文字：「{value.trim()}」</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-950 shrink-0">
                  自述內容
                </span>
              </button>
            )}

            {/* 搜尋出的公開痛點清單 */}
            {filteredPainPoints.length > 0 ? (
              filteredPainPoints.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectPainPoint(item.title, item.id)}
                  className="w-full text-left p-2.5 rounded-xl hover:bg-stone-100 text-stone-900 text-xs flex items-center justify-between transition-colors cursor-pointer group"
                >
                  <div className="min-w-0 pr-2 space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-amber-900 bg-amber-50 px-1.5 py-0.2 rounded text-[10px] border border-amber-200">
                        {item.id}
                      </span>
                      <span className="text-[10px] text-stone-500 font-bold">
                        {item.category}
                      </span>
                    </div>
                    <p className="font-semibold text-stone-800 group-hover:text-amber-700 transition-colors line-clamp-1">
                      {item.title}
                    </p>
                  </div>
                  <Check className="w-3.5 h-3.5 text-stone-300 group-hover:text-amber-600 shrink-0" />
                </button>
              ))
            ) : (
              <div className="p-3 text-center text-xs text-stone-500 space-y-1">
                <p className="font-bold">未找到符合「{value}」的公開痛點</p>
                <p className="text-[11px] text-stone-400">
                  您可以直接在此欄位填寫提案者自述痛點即可！
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

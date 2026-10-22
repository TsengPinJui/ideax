import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';

/** 匯職缺篩選：可複選的下拉（不選＝不限）。地區、職務類別共用 */
export type ChipGroup = { name?: string; items: string[] };

type Props = {
  /** 按鈕上的前綴，例如「地區」「職務類別」 */
  prefix: string;
  groups: ChipGroup[];
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
};

export const ChipMultiSelect: React.FC<Props> = ({ prefix, groups, value, onChange, disabled }) => {
  const [open, setOpen] = useState(false);
  // 按鈕在畫面右半邊時，選單往左展開，手機上才不會超出畫面
  const [alignRight, setAlignRight] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const toggle = (c: string) => onChange(value.includes(c) ? value.filter((x) => x !== c) : [...value, c]);
  const label = !value.length ? `${prefix}：不限` : value.length <= 2 ? `${prefix}：${value.join('、')}` : `${prefix}：${value.slice(0, 2).join('、')} 等 ${value.length} 個`;

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          const r = boxRef.current?.getBoundingClientRect();
          if (r) setAlignRight(r.left + r.width / 2 > window.innerWidth / 2);
          setOpen((o) => !o);
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold text-left flex items-center justify-between gap-1.5 outline-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
          value.length ? 'border-[#1e3a8a]/40 bg-blue-50/60 text-[#1e3a8a]' : 'border-stone-200 bg-stone-50/70 text-stone-800'
        }`}
      >
        <span className="truncate">{label}</span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className={`absolute z-40 ${alignRight ? 'right-0' : 'left-0'} mt-1.5 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-stone-200 bg-white shadow-xl p-3 space-y-2.5`} role="listbox" aria-multiselectable="true" aria-label={`${prefix}（可複選）`}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-black text-stone-900">{prefix}（可複選）</span>
            {value.length > 0 && (
              <button type="button" onClick={() => onChange([])} className="text-[11px] font-bold text-stone-500 hover:text-stone-800 flex items-center gap-0.5 cursor-pointer">
                <X className="w-3 h-3" />清除（不限）
              </button>
            )}
          </div>
          {groups.map((g, gi) => (
            <div key={g.name || gi} className="space-y-1">
              {g.name && <div className="text-[10px] font-bold text-stone-400">{g.name}</div>}
              <div className="flex flex-wrap gap-1.5">
                {g.items.map((c) => {
                  const on = value.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      role="option"
                      aria-selected={on}
                      onClick={() => toggle(c)}
                      className={`px-2 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                        on ? 'bg-[#1e3a8a] border-[#1e3a8a] text-white' : 'bg-white border-stone-200 text-stone-700 hover:border-[#1e3a8a]/50'
                      }`}
                    >
                      {on && <Check className="w-3 h-3 stroke-[3]" />}
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="flex justify-end pt-1">
            <button type="button" onClick={() => setOpen(false)} className="px-3 py-1.5 rounded-lg bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-[11px] font-black cursor-pointer">
              完成{value.length ? `（${value.length}）` : ''}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChipMultiSelect;

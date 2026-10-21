import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';

/** 匯職缺：地區可以多選（不選＝不限） */
export const CITY_GROUPS: Array<{ name: string; cities: string[] }> = [
  { name: '北部', cities: ['台北市', '新北市', '基隆市', '桃園市', '新竹市', '新竹縣', '宜蘭縣'] },
  { name: '中部', cities: ['苗栗縣', '台中市', '彰化縣', '南投縣', '雲林縣'] },
  { name: '南部', cities: ['嘉義市', '嘉義縣', '台南市', '高雄市', '屏東縣'] },
  { name: '東部與離島', cities: ['花蓮縣', '台東縣', '澎湖縣', '金門縣', '連江縣'] },
  { name: '其他', cities: ['遠端工作'] },
];
export const ALL_CITIES = CITY_GROUPS.flatMap((g) => g.cities);

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
};

export const CityMultiSelect: React.FC<Props> = ({ value, onChange, disabled }) => {
  const [open, setOpen] = useState(false);
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
  const label = !value.length ? '地區：不限' : value.length <= 2 ? `地區：${value.join('、')}` : `地區：${value.slice(0, 2).join('、')} 等 ${value.length} 個`;

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
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
        <div className="absolute z-40 left-0 mt-1.5 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-stone-200 bg-white shadow-xl p-3 space-y-2.5" role="listbox" aria-multiselectable="true" aria-label="地區（可多選）">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-black text-stone-900">地區（可多選）</span>
            {value.length > 0 && (
              <button type="button" onClick={() => onChange([])} className="text-[11px] font-bold text-stone-500 hover:text-stone-800 flex items-center gap-0.5 cursor-pointer">
                <X className="w-3 h-3" />清除（不限）
              </button>
            )}
          </div>
          {CITY_GROUPS.map((g) => (
            <div key={g.name} className="space-y-1">
              <div className="text-[10px] font-bold text-stone-400">{g.name}</div>
              <div className="flex flex-wrap gap-1.5">
                {g.cities.map((c) => {
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

export default CityMultiSelect;

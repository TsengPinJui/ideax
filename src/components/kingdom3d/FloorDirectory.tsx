import React, { useState } from 'react';
import { Layers, ChevronRight, ChevronDown } from 'lucide-react';
import './kingdomUi.css';

export interface FloorEntry {
  key: string;
  /** 樓層標記：1F、2F、B1… */
  tag: string;
  name: string;
  count: number;
  unit: string;
  level: number;
  zone?: number;
  current?: boolean;
  /** 同一層底下的展區（縮排顯示） */
  child?: boolean;
}

/**
 * 右側樓層表：靠近或走進有多層／地下主展場的建築時出現，
 * 點任一層（展區）就直接到那裡，並顯示該層的件數
 */
export const FloorDirectory: React.FC<{
  title: string;
  entries: FloorEntry[];
  onGo: (e: FloorEntry) => void;
}> = ({ title, entries, onGo }) => {
  const [open, setOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem('ideax_kingdom_floor_dir') !== '0';
    } catch {
      return true;
    }
  });
  const toggle = () =>
    setOpen((o) => {
      try {
        localStorage.setItem('ideax_kingdom_floor_dir', o ? '0' : '1');
      } catch {
        // ignore
      }
      return !o;
    });
  return (
    <div className="kx-root absolute right-2.5 sm:right-4 top-[7.5rem] sm:top-36 z-20 pointer-events-auto w-[11.5rem] sm:w-56">
      <div className="kx-panel kx-corners overflow-hidden">
        <button type="button" onClick={toggle} className="w-full flex items-center gap-2 px-3 py-2 cursor-pointer" aria-expanded={open}>
          <Layers className="w-4 h-4 text-amber-300 shrink-0" />
          <span className="kx-title text-[14px] truncate flex-1 text-left">{title}・樓層</span>
          {open ? <ChevronDown className="w-4 h-4 text-amber-200/70" /> : <ChevronRight className="w-4 h-4 text-amber-200/70" />}
        </button>
        {open && (
          <ul className="px-1.5 pb-1.5 space-y-1" style={{ borderTop: '1px solid rgba(226,184,90,0.25)' }}>
            {entries.map((e) => (
              <li key={e.key} className={e.child ? 'pl-3' : ''}>
                <button
                  type="button"
                  onClick={() => onGo(e)}
                  className="w-full mt-1 rounded-md px-2 py-1.5 flex items-center gap-2 text-left cursor-pointer transition-colors hover:bg-[rgba(226,184,90,0.16)]"
                  style={{
                    background: e.current ? 'rgba(179,38,30,0.6)' : 'rgba(0,0,0,0.22)',
                    border: `1px solid ${e.current ? 'rgba(242,198,106,0.8)' : 'rgba(226,184,90,0.2)'}`,
                  }}
                  title={`前往${e.name}`}
                >
                  <span
                    className="w-8 shrink-0 text-center text-[11.5px] rounded py-0.5 tabular-nums"
                    style={{ background: 'rgba(0,0,0,0.35)', color: '#f2c94c', border: '1px solid rgba(226,184,90,0.35)' }}
                  >
                    {e.tag}
                  </span>
                  <span className="min-w-0 flex-1 text-[12.5px] truncate" style={{ color: '#f6e7c4' }}>
                    {e.name}
                  </span>
                  <span className="shrink-0 text-[11.5px] tabular-nums" style={{ color: e.count > 0 ? '#ffcf6a' : 'rgba(246,231,196,0.5)' }}>
                    {e.count}
                    {e.unit}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

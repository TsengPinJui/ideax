import React, { useState } from 'react';
import { MonitorPlay, Trophy, Megaphone, Hand, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { HomeShowcaseMode } from '../types';

/**
 * 管理儀表板：首頁「創點子」播放區（預留）
 * 先讓管理員選好要播放哪一種內容；播放功能開放前，首頁仍顯示原本的創點子標誌。
 */
const MODES: Array<{ id: HomeShowcaseMode; name: string; desc: string; icon: React.ReactNode }> = [
  { id: 'excellent', name: '優秀作品', desc: '播放創星季比賽的優秀作品', icon: <Trophy className="w-4 h-4" /> },
  { id: 'paid', name: '付費推播', desc: '播放購買推播的作品或廣告', icon: <Megaphone className="w-4 h-4" /> },
  { id: 'custom', name: '管理員自選', desc: '由管理員挑選要播放的作品', icon: <Hand className="w-4 h-4" /> },
];

export const AdminHomeShowcaseCard: React.FC = () => {
  const { homeShowcaseConfig, updateHomeShowcaseConfig } = useApp();
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const save = async (patch: { enabled?: boolean; mode?: HomeShowcaseMode }) => {
    setSaving(true);
    const ok = await updateHomeShowcaseConfig(patch);
    setSaving(false);
    if (ok) setSavedAt(Date.now());
  };

  const { enabled, mode } = homeShowcaseConfig;

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-sky-50/70 border border-sky-200 space-y-3.5 shadow-2xs">
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-xs shrink-0">
            <MonitorPlay className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-black text-sm sm:text-base text-sky-950 flex items-center gap-2 flex-wrap">
              <span>首頁創點子播放區</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-sky-700 border border-sky-200">預留・尚未播放</span>
            </h4>
            <p className="text-xs text-sky-900/70 mt-0.5">
              首頁最上方的創點子區塊之後會變成播放區。先在這裡選好要播放什麼；播放功能開放前，首頁仍顯示原本的創點子標誌。
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => save({ enabled: !enabled })}
          disabled={saving}
          className={`mt-1 sm:mt-0 w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 disabled:opacity-60 ${enabled ? 'bg-sky-500' : 'bg-stone-300'}`}
          title={enabled ? '點擊關閉播放區' : '點擊啟用播放區'}
          aria-label="啟用首頁播放區"
          aria-pressed={enabled}
        >
          <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>

      <div className={`grid grid-cols-1 sm:grid-cols-3 gap-2.5 transition-opacity ${enabled ? '' : 'opacity-60'}`} role="radiogroup" aria-label="播放內容">
        {MODES.map((m) => {
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => !active && save({ mode: m.id })}
              disabled={saving}
              className={`text-left p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 disabled:cursor-wait ${
                active ? 'bg-white border-sky-400 ring-2 ring-sky-200 shadow-2xs' : 'bg-white/60 border-stone-200 hover:border-sky-300'
              }`}
            >
              <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${active ? 'bg-sky-500 text-white' : 'bg-stone-100 text-stone-500'}`}>{m.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-xs font-black text-stone-900">
                  {m.name}
                  {active && <Check className="w-3.5 h-3.5 text-sky-600" />}
                </span>
                <span className="block text-[11px] text-stone-500 mt-0.5 leading-snug">{m.desc}</span>
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-sky-900/70">
        目前設定：{enabled ? `啟用，播放「${MODES.find((m) => m.id === mode)?.name}」` : '關閉（首頁顯示創點子標誌）'}
        {saving ? '・儲存中…' : savedAt ? '・已儲存' : ''}
      </p>
    </div>
  );
};

export default AdminHomeShowcaseCard;

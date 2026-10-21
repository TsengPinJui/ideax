import React, { useMemo, useState } from 'react';
import { MonitorPlay, Trophy, Megaphone, Hand, Check, Search, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { HOME_SHOWCASE_MAX_CUSTOM, type HomeShowcaseMode, type Question } from '../types';

const TYPE_LABEL: Record<string, string> = {
  innovation_proposal: '創點子提案',
  vibecoding_app: 'VibeCoding 作品',
  pain_point: '痛點',
  seek_solution: '問題',
  chat_discussion: '討論',
};
const isWork = (q: Question) => q.postType === 'innovation_proposal' || q.postType === 'vibecoding_app';

/** 管理員自選：打字搜尋作品並勾選（最多 30 個，依勾選順序播放） */
const CustomShowcasePicker: React.FC<{ ids: string[]; disabled: boolean; onChange: (ids: string[]) => void }> = ({ ids, disabled, onChange }) => {
  const { questions } = useApp();
  const [q, setQ] = useState('');
  const [scope, setScope] = useState<'works' | 'all'>('works');
  const byId = useMemo(() => new Map((questions || []).map((x) => [x.id, x])), [questions]);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const pool = (questions || []).filter((x) => (scope === 'works' ? isWork(x) : true));
    const hit = needle
      ? pool.filter((x) =>
          [x.title, x.authorName, ...(x.tags || [])].some((s) => String(s || '').toLowerCase().includes(needle)))
      : pool;
    return [...hit].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))).slice(0, 8);
  }, [questions, q, scope]);

  const toggle = (id: string) => {
    if (ids.includes(id)) onChange(ids.filter((x) => x !== id));
    else if (ids.length < HOME_SHOWCASE_MAX_CUSTOM) onChange([...ids, id]);
  };
  const full = ids.length >= HOME_SHOWCASE_MAX_CUSTOM;

  return (
    <div className="rounded-xl border border-sky-200 bg-white p-3 space-y-2.5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs font-black text-sky-950">管理員自選作品</span>
        <span className={`text-[11px] font-bold ${full ? 'text-amber-700' : 'text-stone-500'}`}>已選 {ids.length}／{HOME_SHOWCASE_MAX_CUSTOM}</span>
      </div>

      {/* 已選：依勾選順序播放 */}
      {ids.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {ids.map((id, i) => {
            const item = byId.get(id);
            return (
              <span key={id} className="inline-flex items-center gap-1 max-w-full pl-2 pr-1 py-0.5 rounded-lg bg-sky-50 border border-sky-200 text-[11px] text-sky-900">
                <span className="font-mono text-sky-500">{i + 1}.</span>
                <span className="truncate max-w-[14rem]">{item ? item.title : `（找不到這個作品：${id}）`}</span>
                <button type="button" disabled={disabled} onClick={() => toggle(id)} aria-label="移除" className="p-0.5 rounded hover:bg-sky-100 cursor-pointer disabled:cursor-wait">
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* 搜尋 */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[12rem]">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="打字搜尋作品標題、作者或標籤"
            aria-label="搜尋要播放的作品"
            className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-stone-200 bg-stone-50 focus:bg-white focus:border-sky-400 text-xs outline-none"
          />
        </div>
        <div className="inline-flex rounded-lg border border-stone-200 p-0.5 bg-stone-50 text-[11px] font-bold">
          {(['works', 'all'] as const).map((s) => (
            <button key={s} type="button" onClick={() => setScope(s)} className={`px-2 py-1 rounded-md cursor-pointer ${scope === s ? 'bg-white text-sky-800 shadow-2xs' : 'text-stone-500'}`}>
              {s === 'works' ? '只看作品' : '全部卡片'}
            </button>
          ))}
        </div>
      </div>

      {/* 結果：勾選 */}
      <div className="divide-y divide-stone-100 rounded-lg border border-stone-100">
        {results.length === 0 ? (
          <div className="px-3 py-3 text-[11px] text-stone-400">{q.trim() ? '找不到符合的作品' : '目前沒有作品'}</div>
        ) : (
          results.map((x) => {
            const on = ids.includes(x.id);
            return (
              <label key={x.id} className={`flex items-center gap-2.5 px-2.5 py-2 ${disabled || (!on && full) ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:bg-sky-50/60'}`}>
                <input type="checkbox" checked={on} disabled={disabled || (!on && full)} onChange={() => toggle(x.id)} className="w-4 h-4 accent-sky-500 shrink-0" />
                {x.coverImage ? <img src={x.coverImage} alt="" className="w-9 h-9 rounded-md object-cover shrink-0" /> : <span className="w-9 h-9 rounded-md bg-stone-100 shrink-0" />}
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold text-stone-900 truncate">{x.title}</span>
                  <span className="block text-[10px] text-stone-500 truncate">{TYPE_LABEL[x.postType || ''] || '卡片'}・{x.authorName}</span>
                </span>
              </label>
            );
          })
        )}
      </div>
      {!q.trim() && results.length > 0 && <p className="text-[10px] text-stone-400">沒有輸入時顯示最新 8 個；打字可以找更多。</p>}
    </div>
  );
};

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

  const save = async (patch: { enabled?: boolean; modes?: HomeShowcaseMode[]; customIds?: string[] }) => {
    setSaving(true);
    const ok = await updateHomeShowcaseConfig(patch);
    setSaving(false);
    if (ok) setSavedAt(Date.now());
  };

  const { enabled, modes, customIds } = homeShowcaseConfig;
  const toggleMode = (id: HomeShowcaseMode) =>
    save({ modes: modes.includes(id) ? modes.filter((x) => x !== id) : MODES.map((m) => m.id).filter((x) => x === id || modes.includes(x)) });
  const chosen = MODES.filter((m) => modes.includes(m.id)).map((m) => (m.id === 'custom' ? `「${m.name}（${(customIds || []).length} 個）」` : `「${m.name}」`)).join('、');

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
              首頁最上方的創點子區塊之後會變成播放區。先在這裡勾選要播放什麼（可複選）；播放功能開放前，首頁仍顯示原本的創點子標誌。
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

      <div className={`grid grid-cols-1 sm:grid-cols-3 gap-2.5 transition-opacity ${enabled ? '' : 'opacity-60'}`} role="group" aria-label="播放內容（可複選）">
        {MODES.map((m) => {
          const active = modes.includes(m.id);
          return (
            <button
              key={m.id}
              type="button"
              role="checkbox"
              aria-checked={active}
              onClick={() => toggleMode(m.id)}
              disabled={saving}
              className={`text-left p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 disabled:cursor-wait ${
                active ? 'bg-white border-sky-400 ring-2 ring-sky-200 shadow-2xs' : 'bg-white/60 border-stone-200 hover:border-sky-300'
              }`}
            >
              <span className={`w-5 h-5 mt-1 rounded-md border-2 flex items-center justify-center shrink-0 ${active ? 'bg-sky-500 border-sky-500 text-white' : 'bg-white border-stone-300'}`}>
                {active && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </span>
              <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${active ? 'bg-sky-100 text-sky-700' : 'bg-stone-100 text-stone-500'}`}>{m.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-black text-stone-900">{m.name}</span>
                <span className="block text-[11px] text-stone-500 mt-0.5 leading-snug">{m.desc}</span>
              </span>
            </button>
          );
        })}
      </div>

      {modes.includes('custom') && (
        <CustomShowcasePicker ids={customIds || []} disabled={saving} onChange={(next) => save({ customIds: next })} />
      )}

      <p className="text-[11px] text-sky-900/70">
        可複選，勾選多項時之後會輪流播放。目前設定：
        {enabled ? (chosen ? `啟用，播放${chosen}` : '啟用，但還沒勾選要播放的內容') : '關閉（首頁顯示創點子標誌）'}
        {saving ? '・儲存中…' : savedAt ? '・已儲存' : ''}
      </p>
    </div>
  );
};

export default AdminHomeShowcaseCard;

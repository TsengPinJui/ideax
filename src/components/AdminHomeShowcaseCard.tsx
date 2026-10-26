import React, { useMemo, useState } from 'react';
import { MonitorPlay, Trophy, Megaphone, Hand, Check, Search, X, ArrowUp, ArrowDown, ChevronsUp, ChevronsDown, Flame, Eye, ChevronDown } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { HOME_SHOWCASE_MAX_CUSTOM, type HomeShowcaseMode, type Question } from '../types';
import { useShowcaseSlides } from './HomeShowcasePlayer';
import { stripAppNameFromTitle } from '../utils/titleFormat';
import { getHotRankedGames } from '../data/hotGamesData';
import { isGameQuestion } from '../utils/gameClassification';

const TYPE_LABEL: Record<string, string> = {
  innovation_proposal: '創點子提案',
  vibecoding_app: '軟體網站作品',
  pain_point: '痛點',
  seek_solution: '問題',
  chat_discussion: '討論',
};
const isWork = (q: Question) => q.postType === 'innovation_proposal' || q.postType === 'vibecoding_app';

/** 管理員自選：打字搜尋作品並勾選，支援自訂輪播順序調整（最多 30 個，依排序順序播放） */
const CustomShowcasePicker: React.FC<{
  ids: string[];
  disabled: boolean;
  onChange: (ids: string[]) => void;
}> = ({ ids, disabled, onChange }) => {
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
    return [...hit].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  }, [questions, q, scope]);

  const toggle = (id: string) => {
    if (ids.includes(id)) onChange(ids.filter((x) => x !== id));
    else if (ids.length < HOME_SHOWCASE_MAX_CUSTOM) onChange([...ids, id]);
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    const next = [...ids];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    onChange(next);
  };

  const moveToTop = (index: number) => {
    if (index === 0) return;
    const next = [...ids];
    const [moved] = next.splice(index, 1);
    next.unshift(moved);
    onChange(next);
  };

  const moveToBottom = (index: number) => {
    if (index === ids.length - 1) return;
    const next = [...ids];
    const [moved] = next.splice(index, 1);
    next.push(moved);
    onChange(next);
  };

  const full = ids.length >= HOME_SHOWCASE_MAX_CUSTOM;

  return (
    <div className="rounded-xl border border-sky-200 bg-white p-3 space-y-2.5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs font-black text-sky-950">管理員自選作品（可自訂輪播順序）</span>
        <span className={`text-[11px] font-bold ${full ? 'text-amber-700' : 'text-stone-500'}`}>已選 {ids.length}／{HOME_SHOWCASE_MAX_CUSTOM}</span>
      </div>

      {/* 已選清單：支援排序上下移動與移除 */}
      {ids.length > 0 && (
        <div className="space-y-1.5 pt-0.5">
          <div className="flex items-center justify-between text-[11px] text-sky-900/80">
            <span className="font-bold flex items-center gap-1">
              <span>輪播排序清單</span>
              <span className="text-[10px] text-stone-500 font-normal">（可使用 ▲ ▼ 或 ⇈ ⇊ 置頂調整展示順序，自選作品播放時優先置首）</span>
            </span>
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-[10px] text-red-600 hover:text-red-700 underline cursor-pointer"
            >
              全部清除
            </button>
          </div>

          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {ids.map((id, i) => {
              const item = byId.get(id);
              return (
                <div
                  key={id}
                  className="flex items-center gap-2 p-1.5 rounded-xl bg-sky-50/90 border border-sky-200 text-xs hover:border-sky-300 transition-colors"
                >
                  <span className="w-6 h-6 rounded-lg bg-sky-200/90 text-sky-950 font-mono font-black text-[11px] flex items-center justify-center shrink-0">
                    #{i + 1}
                  </span>
                  {item?.coverImage ? (
                    <img src={item.coverImage} alt="" className="w-8 h-8 rounded-md object-cover shrink-0" />
                  ) : (
                    <span className="w-8 h-8 rounded-md bg-sky-100 flex items-center justify-center text-[10px] text-sky-600 font-bold shrink-0">
                      {TYPE_LABEL[item?.postType || '']?.slice(0, 2) || '卡片'}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-black text-sky-950 text-xs">
                      {item ? stripAppNameFromTitle(item.title, item.appName) : `（找不到這個作品：${id}）`}
                    </div>
                    <div className="text-[10px] text-sky-700 truncate flex items-center gap-1.5">
                      {(item?.isSimulated || item?.simulatedBatchId) && (
                        <span className="px-1 rounded bg-violet-100 text-violet-700 font-bold">虛擬</span>
                      )}
                      <span>{item?.appName ? `${item.appName}・` : ''}{TYPE_LABEL[item?.postType || ''] || '卡片'}・{item?.authorName || '未知作者'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      disabled={i === 0}
                      onClick={() => moveToTop(i)}
                      title="置頂（排在第 1 名優先播放）"
                      aria-label={`將第 ${i + 1} 個作品移到第 1 名`}
                      className="p-1 rounded-md text-sky-800 hover:bg-sky-200/80 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronsUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={i === 0}
                      onClick={() => moveItem(i, -1)}
                      title="往上移 1 格（優先播放）"
                      aria-label={`將第 ${i + 1} 個作品往上移動`}
                      className="p-1 rounded-md text-sky-800 hover:bg-sky-200/80 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={i === ids.length - 1}
                      onClick={() => moveItem(i, 1)}
                      title="往下移 1 格（延後播放）"
                      aria-label={`將第 ${i + 1} 個作品往下移動`}
                      className="p-1 rounded-md text-sky-800 hover:bg-sky-200/80 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={i === ids.length - 1}
                      onClick={() => moveToBottom(i)}
                      title="置底（移到最後一名）"
                      aria-label={`將第 ${i + 1} 個作品移到最後`}
                      className="p-1 rounded-md text-sky-800 hover:bg-sky-200/80 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronsDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggle(id)}
                      title="移除此項"
                      aria-label="移除此項"
                      className="p-1 rounded-md text-stone-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
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

      {/* 結果：勾選（支援上下滑動瀏覽所有作品） */}
      <div className="divide-y divide-stone-100 rounded-lg border border-stone-200/80 max-h-72 overflow-y-auto bg-stone-50/30">
        {results.length === 0 ? (
          <div className="px-3 py-4 text-center text-[11px] text-stone-400">{q.trim() ? '找不到符合的作品' : '目前沒有作品'}</div>
        ) : (
          results.map((x) => {
            const on = ids.includes(x.id);
            return (
              <div
                key={x.id}
                className={`flex items-center gap-2.5 px-2.5 py-2 transition-colors ${
                  disabled || (!on && full) ? 'opacity-70 bg-stone-50/50' : 'hover:bg-sky-50/70 bg-white'
                }`}
              >
                <input
                  type="checkbox"
                  checked={on}
                  disabled={disabled || (!on && full)}
                  onChange={() => toggle(x.id)}
                  className="w-4 h-4 accent-sky-500 shrink-0 cursor-pointer"
                  aria-label={`選取作品 ${x.title}`}
                />
                {x.coverImage ? (
                  <img src={x.coverImage} alt="" className="w-9 h-9 rounded-md object-cover shrink-0" />
                ) : (
                  <span className="w-9 h-9 rounded-md bg-stone-100 shrink-0" />
                )}
                <div
                  className="min-w-0 flex-1 cursor-pointer select-none"
                  onClick={() => (!disabled && (on || !full) ? toggle(x.id) : null)}
                >
                  <span className="block text-xs font-bold text-stone-900 truncate">
                    {stripAppNameFromTitle(x.title, x.appName)}
                  </span>
                  <span className="block text-[10px] text-stone-500 truncate">
                    {(x.isSimulated || x.simulatedBatchId) && (
                      <span className="mr-1 px-1 rounded bg-violet-100 text-violet-700 font-bold">虛擬</span>
                    )}
                    {x.appName ? `${x.appName}・` : ''}{TYPE_LABEL[x.postType || ''] || '卡片'}・{x.authorName}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="flex items-center justify-between text-[10px] text-stone-400 px-1">
        <span>共 {results.length} 個可選項目（可上下滑動滾動挑選）</span>
        {ids.length > 0 && <span className="text-sky-700 font-medium">已選 {ids.length} 個</span>}
      </div>
    </div>
  );
};

/**
 * 管理儀表板：首頁「創點子」播放區
 * 啟用並勾選要播放的內容後，首頁最上方改成輪播；沒有可播放的內容時仍顯示創點子標誌。
 */
const MODES: Array<{ id: HomeShowcaseMode; name: string; desc: string; icon: React.ReactNode }> = [
  { id: 'excellent', name: '優秀作品', desc: '創星季參賽作品，依按讚、附議、支持點數取前 8 名', icon: <Trophy className="w-4 h-4" /> },
  { id: 'paid', name: '付費推播', desc: '發布時加購推播、仍在招募中的卡片（標示「推播」）', icon: <Megaphone className="w-4 h-4" /> },
  { id: 'custom', name: '管理員自選', desc: '由管理員挑選要播放的作品（最優先置首播放）', icon: <Hand className="w-4 h-4" /> },
];

export const AdminHomeShowcaseCard: React.FC = () => {
  const { homeShowcaseConfig, updateHomeShowcaseConfig } = useApp();
  const slides = useShowcaseSlides();
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const save = async (patch: { enabled?: boolean; modes?: HomeShowcaseMode[]; customIds?: string[]; includeSimulated?: boolean; hideHeroTitles?: boolean }) => {
    setSaving(true);
    const ok = await updateHomeShowcaseConfig(patch);
    setSaving(false);
    if (ok) setSavedAt(Date.now());
  };

  const { enabled, modes, customIds } = homeShowcaseConfig;
  const includeSimulated = homeShowcaseConfig.includeSimulated !== false;
  const toggleMode = (id: HomeShowcaseMode) =>
    save({ modes: modes.includes(id) ? modes.filter((x) => x !== id) : MODES.map((m) => m.id).filter((x) => x === id || modes.includes(x)) });
  const chosen = MODES.filter((m) => modes.includes(m.id)).map((m) => (m.id === 'custom' ? `「${m.name}（${(customIds || []).length} 個）」` : `「${m.name}」`)).join('、');

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-sky-50/70 border border-sky-200 space-y-3.5 shadow-2xs transition-all">
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2.5 cursor-pointer flex-1 select-none group"
        >
          <div className="w-9 h-9 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform">
            <MonitorPlay className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-black text-sm sm:text-base text-sky-950 flex items-center gap-2 flex-wrap">
              <span>首頁輪播&精選榜</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${enabled && slides.length ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-stone-500 border-stone-200'}`}>
                {!enabled ? '未啟用' : slides.length ? `播放中・${slides.length} 個` : '沒有可播放的內容'}
              </span>
              <span className="text-[10px] text-sky-700/70 font-normal">
                {isExpanded ? '（點擊收合）' : '（點擊展開設定）'}
              </span>
            </h4>
            <p className="text-xs text-sky-900/70 mt-0.5 line-clamp-1">
              首頁最上方輪播展示與精選推薦內容管理（預設收合）。
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              save({ enabled: !enabled });
            }}
            disabled={saving}
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 disabled:opacity-60 ${enabled ? 'bg-sky-500' : 'bg-stone-300'}`}
            title={enabled ? '點擊關閉首頁輪播&精選榜' : '點擊啟用首頁輪播&精選榜'}
            aria-label="啟用首頁輪播&精選榜"
            aria-pressed={enabled}
          >
            <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-lg text-sky-800 hover:bg-sky-100/70 transition-colors cursor-pointer"
            aria-label={isExpanded ? '收合首頁輪播&精選榜' : '展開首頁輪播&精選榜'}
          >
            <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-3.5 pt-1 border-t border-sky-100 animate-in fade-in duration-150">
          <p className="text-xs text-sky-900/80 leading-relaxed">
            啟用後，首頁最上方的創點子標誌會換成輪播（每 5 秒換一個，滑鼠移上去或手指按住會暫停）。若勾選「管理員自選」，自選作品將最優先依照您排定的順序播放（最多 30 個）；沒有可播放的內容時仍顯示創點子標誌。
          </p>

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

          {/* 首頁大標題、小標題：可以隱藏，讓播放區更突出 */}
          <label className="flex items-center justify-between gap-3 rounded-xl border border-sky-200 bg-white px-3 py-2.5 cursor-pointer">
            <span className="min-w-0">
              <span className="block text-xs font-black text-sky-950">隱藏首頁大標題與小標題</span>
              <span className="block text-[11px] text-stone-500">「一個問題，找到更多可能。」和「痛點許願 · 創新提案 · 專家懸賞」不顯示（搜尋引擎仍讀得到大標題）。</span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={Boolean(homeShowcaseConfig.hideHeroTitles)}
              disabled={saving}
              onClick={() => save({ hideHeroTitles: !homeShowcaseConfig.hideHeroTitles })}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 disabled:opacity-60 ${homeShowcaseConfig.hideHeroTitles ? 'bg-sky-500' : 'bg-stone-300'}`}
            >
              <span className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${homeShowcaseConfig.hideHeroTitles ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </label>

          {/* 虛擬卡片：真實作品還不多時先打開，讓播放區有內容 */}
          <label className="flex items-center justify-between gap-3 rounded-xl border border-sky-200 bg-white px-3 py-2.5 cursor-pointer">
            <span className="min-w-0">
              <span className="block text-xs font-black text-sky-950">包含虛擬卡片</span>
              <span className="block text-[11px] text-stone-500">「優秀作品」「付費推播」也播放平台的虛擬（模擬）卡片；真實作品夠多後可以關掉。「管理員自選」一律可以選虛擬卡片。</span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={includeSimulated}
              disabled={saving}
              onClick={() => save({ includeSimulated: !includeSimulated })}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 disabled:opacity-60 ${includeSimulated ? 'bg-sky-500' : 'bg-stone-300'}`}
            >
              <span className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${includeSimulated ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </label>

          {modes.includes('custom') && (
            <CustomShowcasePicker
              ids={customIds || []}
              disabled={saving}
              onChange={(next) => save({ customIds: next })}
            />
          )}

          <p className="text-[11px] text-sky-900/70">
            目前設定：
            {enabled ? (chosen ? `啟用，播放${chosen}${slides.length ? `，共 ${slides.length} 個` : '，但目前沒有符合的內容（首頁顯示創點子標誌）'}` : '啟用，但還沒勾選要播放的內容') : '關閉（首頁顯示創點子標誌）'}
            {saving ? '・儲存中…' : savedAt ? '・已儲存' : ''}
          </p>
        </div>
      )}
    </div>
  );
};

/** 首頁熱度榜：管理員可指定榜單順序，或改用作品瀏覽次數即時排序。 */
export const AdminHotGamesConfigCard: React.FC = () => {
  const { questions, homeShowcaseConfig, updateHomeShowcaseConfig } = useApp();
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const mode = homeShowcaseConfig.hotGamesMode || 'custom';
  const ids = homeShowcaseConfig.hotGameIds || [];
  const seeds = getHotRankedGames(questions).map((x) => x.question);
  const isGame = (x: Question) => {
    const text = `${x.title || ''} ${x.description || ''}`;
    return x.status !== 'delisted' && x.status !== 'closed' && (isGameQuestion(x) || (x.category as string) === '遊戲' || x.subcategory === '遊戲' || x.subcategories?.includes('遊戲') || x.tags?.some((tag) => ['遊戲', '小遊戲', '桌遊'].includes(tag)) || /遊戲|桌遊|game|rpg/i.test(text));
  };
  const byId = new Map<string, Question>();
  [...questions.filter(isGame), ...seeds].forEach((q) => { if (!byId.has(q.id)) byId.set(q.id, q); });
  const pool = [...byId.values()].filter((q) => !q.isSimulated && !q.simulatedBatchId);
  const selected = ids.map((id) => byId.get(id)).filter((q): q is Question => Boolean(q));
  const results = pool.filter((q) => !ids.includes(q.id) && (!query.trim() || `${q.title} ${q.authorName || ''} ${(q.tags || []).join(' ')}`.toLowerCase().includes(query.trim().toLowerCase())));

  const save = async (patch: { hotGamesMode?: 'custom' | 'views'; hotGameIds?: string[] }) => {
    setSaving(true);
    await updateHomeShowcaseConfig(patch);
    setSaving(false);
  };
  const move = (index: number, delta: -1 | 1) => {
    const next = [...ids];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    void save({ hotGameIds: next });
  };
  const title = (q: Question) => stripAppNameFromTitle(q.title, q.appName);

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-3 shadow-2xs transition-all">
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-start sm:items-center justify-between gap-3 cursor-pointer select-none group"
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Flame className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-black text-sm sm:text-base text-rose-950 flex items-center gap-2 flex-wrap">
              <span>首頁熱度榜設定</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-rose-800 border border-rose-200">
                {mode === 'custom' ? `自選榜單・${ids.length}/10 個` : '依作品瀏覽數排序'}
              </span>
              <span className="text-[10px] text-rose-700/70 font-normal">
                {isExpanded ? '（點擊收合）' : '（點擊展開設定）'}
              </span>
            </h4>
            <p className="text-xs text-rose-900/70 mt-0.5 line-clamp-1">
              設定首頁熱度榜排序方式與自選順序（預設收合）。
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="p-1 rounded-lg text-rose-800 hover:bg-rose-100/70 transition-colors cursor-pointer shrink-0"
          aria-label={isExpanded ? '收合首頁熱度榜設定' : '展開首頁熱度榜設定'}
        >
          <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-3 pt-1 border-t border-rose-100 animate-in fade-in duration-150">
          <p className="text-xs text-rose-900/80 leading-relaxed">
            選擇手動編排榜單（可自由搜尋並調整前 10 名次序），或依遊戲作品的瀏覽次數即時由高至低自動排序。
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {([
              { id: 'custom' as const, label: '管理員自選', detail: '自行挑選並調整前 10 名', icon: <Flame className="w-4 h-4" /> },
              { id: 'views' as const, label: '依瀏覽次數排序', detail: '遊戲作品依瀏覽數由高至低排列', icon: <Eye className="w-4 h-4" /> },
            ]).map((option) => (
              <button key={option.id} type="button" disabled={saving} onClick={() => void save({ hotGamesMode: option.id })}
                className={`text-left p-3 rounded-xl border flex items-center gap-2.5 transition-colors cursor-pointer disabled:opacity-60 ${mode === option.id ? 'bg-white border-rose-400 ring-2 ring-rose-200 shadow-2xs' : 'bg-white/60 border-stone-200 hover:border-rose-300'}`}>
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${mode === option.id ? 'bg-rose-100 text-rose-700' : 'bg-stone-100 text-stone-500'}`}>{option.icon}</span>
                <span><span className="block text-xs font-black text-stone-900">{option.label}</span><span className="block text-[11px] text-stone-500">{option.detail}</span></span>
                {mode === option.id && <Check className="w-4 h-4 text-rose-600 ml-auto" />}
              </button>
            ))}
          </div>

          {mode === 'custom' && (
            <div className="rounded-xl border border-rose-200 bg-white p-3 space-y-2.5">
              <div className="flex justify-between items-center text-xs font-black text-rose-950"><span>自選榜單排序</span><span>{ids.length}/10</span></div>
              {selected.length > 0 && <div className="space-y-1 max-h-56 overflow-y-auto">
                {selected.map((q, i) => <div key={q.id} className="flex items-center gap-2 rounded-lg bg-rose-50 px-2 py-1.5">
                  <span className="w-5 text-center text-[11px] font-mono font-black text-rose-700">{i + 1}</span><span className="min-w-0 flex-1 truncate text-xs font-bold">{title(q)}</span>
                  <button type="button" disabled={saving || i === 0} onClick={() => move(i, -1)} aria-label="上移" className="p-1 text-rose-700 disabled:opacity-30 cursor-pointer"><ArrowUp className="w-3.5 h-3.5" /></button>
                  <button type="button" disabled={saving || i === selected.length - 1} onClick={() => move(i, 1)} aria-label="下移" className="p-1 text-rose-700 disabled:opacity-30 cursor-pointer"><ArrowDown className="w-3.5 h-3.5" /></button>
                  <button type="button" disabled={saving} onClick={() => void save({ hotGameIds: ids.filter((id) => id !== q.id) })} aria-label="移除" className="p-1 text-stone-400 hover:text-red-600 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                </div>)}
              </div>}
              <div className="relative"><Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜尋遊戲名稱、作者或標籤" className="w-full pl-8 pr-3 py-2 rounded-lg border border-stone-200 bg-stone-50 text-xs outline-none focus:border-rose-400" /></div>
              <div className="max-h-52 overflow-y-auto divide-y divide-stone-100 border border-stone-100 rounded-lg">
                {results.map((q) => <button key={q.id} type="button" disabled={saving || ids.length >= 10} onClick={() => void save({ hotGameIds: [...ids, q.id] })} className="w-full px-2.5 py-2 flex items-center gap-2 text-left hover:bg-rose-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed">
                  <span className="text-rose-600 font-black">＋</span><span className="truncate text-xs font-bold">{title(q)}</span><span className="ml-auto shrink-0 text-[10px] text-stone-400">瀏覽 {q.viewsCount ?? q.views ?? 0}</span>
                </button>)}
                {results.length === 0 && <div className="px-3 py-4 text-center text-[11px] text-stone-400">沒有其他符合的遊戲</div>}
              </div>
            </div>
          )}
          <p className="text-[11px] text-rose-900/70">{saving ? '儲存中…' : '設定會同步儲存並套用於首頁熱度榜。'}</p>
        </div>
      )}
    </div>
  );
};

export default AdminHomeShowcaseCard;

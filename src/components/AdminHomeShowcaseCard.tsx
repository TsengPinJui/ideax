import React, { useMemo, useState } from 'react';
import { MonitorPlay, Trophy, Megaphone, Hand, Check, Search, X, ArrowUp, ArrowDown, ChevronsUp, ChevronsDown, Flame, Eye, ChevronDown, Lightbulb, Gamepad2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { HOME_SHOWCASE_MAX_CUSTOM, type HomeShowcaseCategory, type HomeShowcaseConfig, type HomeShowcaseMode, type Question } from '../types';
import { useShowcaseSlides } from './HomeShowcasePlayer';
import { stripAppNameFromTitle } from '../utils/titleFormat';
import {
  HOT_GAMES_DEFS,
  createHotGameQuestion,
  getHotRankedGames,
  getHotRankedProposalsAndSoftware,
  isShowcaseGameQuestion,
  isShowcaseProposalOrSoftwareQuestion,
} from '../data/hotGamesData';

const getItemCategoryBadge = (q?: Question): string => {
  if (!q) return '作品';
  if (isShowcaseGameQuestion(q)) return '遊戲';
  if (q.postType === 'innovation_proposal') return '創新提案';
  return '遊戲以外軟體';
};

/** 管理員自選：打字搜尋作品並勾選，支援自訂輪播順序調整（最多 30 個，依排序順序播放） */
const CustomShowcasePicker: React.FC<{
  ids: string[];
  disabled: boolean;
  category: HomeShowcaseCategory;
  onChange: (ids: string[]) => void;
}> = ({ ids, disabled, category, onChange }) => {
  const { questions } = useApp();
  const [q, setQ] = useState('');
  const [subFilter, setSubFilter] = useState<'all' | 'proposal' | 'software'>('all');

  const allItemsWithSeeds = useMemo(() => {
    const map = new Map<string, Question>();
    (questions || []).forEach((x) => {
      if (x && x.status !== 'delisted' && x.status !== 'closed') {
        map.set(x.id, x);
      }
    });
    HOT_GAMES_DEFS.map(createHotGameQuestion).forEach((g) => {
      if (!map.has(g.id)) map.set(g.id, g);
    });
    return [...map.values()];
  }, [questions]);

  const byId = useMemo(() => new Map(allItemsWithSeeds.map((x) => [x.id, x])), [allItemsWithSeeds]);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    // 若選擇「遊戲」：只留遊戲；若選擇「提案與軟體」：只顯示「創新提案」與「遊戲以外軟體」
    const categoryPool = allItemsWithSeeds.filter((x) =>
      category === 'games' ? isShowcaseGameQuestion(x) : isShowcaseProposalOrSoftwareQuestion(x)
    );
    const pool =
      category === 'proposals_software'
        ? categoryPool.filter((x) => {
            if (subFilter === 'proposal') return x.postType === 'innovation_proposal';
            if (subFilter === 'software') return x.postType !== 'innovation_proposal';
            return true;
          })
        : categoryPool;
    const hit = needle
      ? pool.filter((x) =>
          [x.title, x.authorName, ...(x.tags || [])].some((s) => String(s || '').toLowerCase().includes(needle)))
      : pool;
    return [...hit].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  }, [allItemsWithSeeds, q, subFilter, category]);

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
  const catLabel = category === 'proposals_software' ? '創新與軟體' : '遊戲';

  return (
    <div className="rounded-xl border border-sky-200 bg-white p-3 space-y-2.5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs font-black text-sky-950">
          管理員自選「{catLabel}」作品（可自訂輪播順序）
        </span>
        <span className={`text-[11px] font-bold ${full ? 'text-amber-700' : 'text-stone-500'}`}>已選 {ids.length}／{HOME_SHOWCASE_MAX_CUSTOM}</span>
      </div>

      {/* 已選清單：支援排序上下移動與移除 */}
      {ids.length > 0 && (
        <div className="space-y-1.5 pt-0.5">
          <div className="flex items-center justify-between text-[11px] text-sky-900/80">
            <span className="font-bold flex items-center gap-1">
              <span>「{catLabel}」輪播排序清單</span>
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
                      {getItemCategoryBadge(item).slice(0, 2)}
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
                      <span>{item?.appName ? `${item.appName}・` : ''}{getItemCategoryBadge(item)}・{item?.authorName || '未知作者'}</span>
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
            placeholder={`打字搜尋「${catLabel}」標題、作者或標籤`}
            aria-label="搜尋要播放的作品"
            className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-stone-200 bg-stone-50 focus:bg-white focus:border-sky-400 text-xs outline-none"
          />
        </div>
        {category === 'proposals_software' ? (
          <div className="inline-flex rounded-lg border border-stone-200 p-0.5 bg-stone-50 text-[11px] font-bold">
            {([
              { id: 'all' as const, label: '全部（提案＋軟體）' },
              { id: 'proposal' as const, label: '創新提案' },
              { id: 'software' as const, label: '遊戲以外軟體' },
            ]).map((s) => (
              <button key={s.id} type="button" onClick={() => setSubFilter(s.id)} className={`px-2 py-1 rounded-md cursor-pointer ${subFilter === s.id ? 'bg-white text-sky-800 shadow-2xs' : 'text-stone-500'}`}>
                {s.label}
              </button>
            ))}
          </div>
        ) : (
          <span className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-[11px] font-bold text-amber-800">
            僅顯示遊戲作品
          </span>
        )}
      </div>

      {/* 結果：勾選（支援上下滑動瀏覽所有作品） */}
      <div className="divide-y divide-stone-100 rounded-lg border border-stone-200/80 max-h-72 overflow-y-auto bg-stone-50/30">
        {results.length === 0 ? (
          <div className="px-3 py-4 text-center text-[11px] text-stone-400">{q.trim() ? `找不到符合的「${catLabel}」作品` : `目前沒有「${catLabel}」作品`}</div>
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
                    <span className="mr-1 px-1 rounded bg-stone-100 text-stone-700 font-bold">{getItemCategoryBadge(x)}</span>
                    {x.appName ? `${x.appName}・` : ''}{x.authorName}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="flex items-center justify-between text-[10px] text-stone-400 px-1">
        <span>共 {results.length} 個可選「{catLabel}」項目（可上下滑動滾動挑選）</span>
        {ids.length > 0 && <span className="text-sky-700 font-medium">已選 {ids.length} 個</span>}
      </div>
    </div>
  );
};

/**
 * 管理員後台顯示設定：選擇首頁輪播與熱度榜默認先顯示「創新與軟體」或「遊戲」（置於進階權限與功能展示設定內）
 */
export const AdminHomeDefaultCategoryCard: React.FC = () => {
  const { homeShowcaseConfig, updateHomeShowcaseConfig } = useApp();
  const [saving, setSaving] = useState(false);
  const defaultCat: HomeShowcaseCategory =
    homeShowcaseConfig.defaultCategory === 'proposals_software' ? 'proposals_software' : 'games';

  const handleSetDefault = async (cat: HomeShowcaseCategory) => {
    if (cat === defaultCat) return;
    setSaving(true);
    await updateHomeShowcaseConfig({ defaultCategory: cat });
    setSaving(false);
  };

  return (
    <div className="p-3.5 rounded-xl border-2 border-purple-500 bg-gradient-to-r from-purple-50 via-white to-indigo-50/70 shadow-sm ring-2 ring-purple-200/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-black text-xs text-purple-950 flex items-center gap-1.5">
            <MonitorPlay className="w-3.5 h-3.5 text-purple-600 shrink-0" />
            <span>首頁輪播與熱度榜・默認先顯示分類</span>
          </span>
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-700 text-white shadow-2xs">
            目前默認：{defaultCat === 'proposals_software' ? '創新與軟體' : '遊戲'}
          </span>
          {saving && <span className="text-[10px] font-bold text-purple-700">儲存中…</span>}
        </div>
        <p className="text-[11px] text-stone-600 mt-1 leading-snug">
          設定訪客進入首頁時，最上方輪播、左側精選榜與右側熱度榜預設先展示哪一類（訪客仍可自行切換）。
        </p>
      </div>

      <div className="inline-flex items-center p-0.5 rounded-lg bg-stone-100 border border-stone-200/80 shrink-0 self-start sm:self-auto">
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSetDefault('proposals_software')}
          className={`px-2.5 py-1 rounded-md text-[11px] font-black transition-all flex items-center gap-1 cursor-pointer disabled:opacity-60 ${
            defaultCat === 'proposals_software'
              ? 'bg-purple-700 text-white shadow-2xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
          }`}
        >
          <Lightbulb className="w-3 h-3" />
          <span>創新與軟體</span>
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSetDefault('games')}
          className={`px-2.5 py-1 rounded-md text-[11px] font-black transition-all flex items-center gap-1 cursor-pointer disabled:opacity-60 ${
            defaultCat === 'games'
              ? 'bg-purple-700 text-white shadow-2xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
          }`}
        >
          <Gamepad2 className="w-3 h-3" />
          <span>遊戲</span>
        </button>
      </div>
    </div>
  );
};

/**
 * 管理儀表板：首頁「創點子」播放區
 * 支援切換編輯「提案與軟體」或「遊戲」任一邊的輪播與精選榜。
 */
const MODES: Array<{ id: HomeShowcaseMode; name: string; desc: string; icon: React.ReactNode }> = [
  { id: 'excellent', name: '優秀作品', desc: '創星季或高分作品，依按讚、附議、支持點數取前 8 名', icon: <Trophy className="w-4 h-4" /> },
  { id: 'paid', name: '付費推播', desc: '發布時加購推播、仍在招募中的卡片（標示「推播」）', icon: <Megaphone className="w-4 h-4" /> },
  { id: 'custom', name: '管理員自選', desc: '由管理員挑選要播放的作品（最優先置首播放）', icon: <Hand className="w-4 h-4" /> },
];

export const AdminHomeShowcaseCard: React.FC = () => {
  const { questions, homeShowcaseConfig, updateHomeShowcaseConfig } = useApp();
  const [editingCategory, setEditingCategory] = useState<HomeShowcaseCategory>(() =>
    homeShowcaseConfig.defaultCategory === 'proposals_software' ? 'proposals_software' : 'games'
  );
  const slides = useShowcaseSlides(editingCategory);
  const proposalSlides = useShowcaseSlides('proposals_software');
  const gameSlides = useShowcaseSlides('games');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const save = async (patch: Partial<HomeShowcaseConfig>) => {
    setSaving(true);
    const ok = await updateHomeShowcaseConfig(patch);
    setSaving(false);
    if (ok) setSavedAt(Date.now());
  };

  const { enabled } = homeShowcaseConfig;
  const defaultCat: HomeShowcaseCategory =
    homeShowcaseConfig.defaultCategory === 'proposals_software' ? 'proposals_software' : 'games';
  const includeSimulated = homeShowcaseConfig.includeSimulated !== false;

  const byId = useMemo(() => {
    const map = new Map<string, Question>();
    (questions || []).forEach((q) => map.set(q.id, q));
    HOT_GAMES_DEFS.map(createHotGameQuestion).forEach((g) => {
      if (!map.has(g.id)) map.set(g.id, g);
    });
    return map;
  }, [questions]);

  const activeModes: HomeShowcaseMode[] =
    editingCategory === 'proposals_software'
      ? Array.isArray(homeShowcaseConfig.proposalModes)
        ? homeShowcaseConfig.proposalModes
        : homeShowcaseConfig.modes || ['excellent']
      : Array.isArray(homeShowcaseConfig.gameModes)
      ? homeShowcaseConfig.gameModes
      : homeShowcaseConfig.modes || ['excellent'];

  const rawCustomIds: string[] =
    editingCategory === 'proposals_software'
      ? Array.isArray(homeShowcaseConfig.proposalCustomIds)
        ? homeShowcaseConfig.proposalCustomIds
        : homeShowcaseConfig.customIds || []
      : Array.isArray(homeShowcaseConfig.gameCustomIds)
      ? homeShowcaseConfig.gameCustomIds
      : homeShowcaseConfig.customIds || [];

  const activeCustomIds: string[] = rawCustomIds.filter((id) => {
    const item = byId.get(id);
    if (!item) return false;
    return editingCategory === 'games'
      ? isShowcaseGameQuestion(item)
      : isShowcaseProposalOrSoftwareQuestion(item);
  });

  const toggleMode = (id: HomeShowcaseMode) => {
    const nextModes = activeModes.includes(id)
      ? activeModes.filter((x) => x !== id)
      : MODES.map((m) => m.id).filter((x) => x === id || activeModes.includes(x));
    if (editingCategory === 'proposals_software') {
      void save({ proposalModes: nextModes, modes: nextModes.length ? nextModes : homeShowcaseConfig.modes });
    } else {
      void save({ gameModes: nextModes, modes: nextModes.length ? nextModes : homeShowcaseConfig.modes });
    }
  };

  const updateCategoryCustomIds = (nextIds: string[]) => {
    if (editingCategory === 'proposals_software') {
      void save({ proposalCustomIds: nextIds });
    } else {
      void save({ gameCustomIds: nextIds });
    }
  };

  const editingCatLabel = editingCategory === 'proposals_software' ? '創新與軟體' : '遊戲';
  const chosen = MODES.filter((m) => activeModes.includes(m.id))
    .map((m) => (m.id === 'custom' ? `「${m.name}（${activeCustomIds.length} 個）」` : `「${m.name}」`))
    .join('、');

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
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${enabled && (proposalSlides.length || gameSlides.length) ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-stone-500 border-stone-200'}`}>
                {!enabled
                  ? '未啟用'
                  : `播放中・創新與軟體 ${proposalSlides.length} 個 / 遊戲 ${gameSlides.length} 個`}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                首頁默認：{defaultCat === 'proposals_software' ? '創新與軟體' : '遊戲'}
              </span>
              <span className="text-[10px] text-sky-700/70 font-normal">
                {isExpanded ? '（點擊收合）' : '（點擊展開設定）'}
              </span>
            </h4>
            <p className="text-xs text-sky-900/70 mt-0.5 line-clamp-1">
              分為「創新與軟體」與「遊戲」兩類，可自由切換編輯任一邊的輪播與精選推薦內容。
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void save({ enabled: !enabled });
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
          {/* 選擇要編輯的輪播分類 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-white border border-sky-200">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black text-sky-950">選擇要編輯的輪播分類：</span>
              <div className="inline-flex items-center p-0.5 rounded-xl bg-sky-50 border border-sky-200">
                <button
                  type="button"
                  onClick={() => setEditingCategory('proposals_software')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                    editingCategory === 'proposals_software'
                      ? 'bg-sky-600 text-white shadow-2xs'
                      : 'text-sky-900 hover:bg-sky-100/70'
                  }`}
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span>編輯「創新與軟體」</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditingCategory('games')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                    editingCategory === 'games'
                      ? 'bg-amber-500 text-white shadow-2xs'
                      : 'text-sky-900 hover:bg-sky-100/70'
                  }`}
                >
                  <Gamepad2 className="w-3.5 h-3.5" />
                  <span>編輯「遊戲」</span>
                </button>
              </div>
            </div>
            <span className="text-[11px] font-bold text-stone-500">
              {editingCategory === 'games' ? '清單僅顯示「遊戲」作品' : '清單僅顯示「創新提案」與「遊戲以外軟體」'}
            </span>
          </div>

          <p className="text-xs text-sky-900/80 leading-relaxed">
            目前正在編輯<strong>「{editingCatLabel}」</strong>輪播與精選榜。若勾選「管理員自選」，自選作品將最優先依照您排定的順序播放（最多 30 個）。
          </p>

          <div className={`grid grid-cols-1 sm:grid-cols-3 gap-2.5 transition-opacity ${enabled ? '' : 'opacity-60'}`} role="group" aria-label={`「${editingCatLabel}」播放內容（可複選）`}>
            {MODES.map((m) => {
              const active = activeModes.includes(m.id);
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
                    <span className="block text-xs font-black text-stone-900">{m.name}（{editingCatLabel}）</span>
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
              onClick={() => void save({ hideHeroTitles: !homeShowcaseConfig.hideHeroTitles })}
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
              onClick={() => void save({ includeSimulated: !includeSimulated })}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 disabled:opacity-60 ${includeSimulated ? 'bg-sky-500' : 'bg-stone-300'}`}
            >
              <span className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${includeSimulated ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </label>

          {activeModes.includes('custom') && (
            <CustomShowcasePicker
              ids={activeCustomIds}
              disabled={saving}
              category={editingCategory}
              onChange={updateCategoryCustomIds}
            />
          )}

          <p className="text-[11px] text-sky-900/70">
            目前「{editingCatLabel}」設定：
            {enabled ? (chosen ? `啟用，播放${chosen}${slides.length ? `，共 ${slides.length} 個` : '，但目前沒有符合的內容'}` : '啟用，但還沒勾選要播放的內容') : '關閉（首頁顯示創點子標誌）'}
            {saving ? '・儲存中…' : savedAt ? '・已儲存' : ''}
          </p>
        </div>
      )}
    </div>
  );
};

/** 首頁熱度榜：管理員可切換「提案與軟體」或「遊戲」任一邊，指定榜單順序或改用瀏覽次數即時排序。 */
export const AdminHotGamesConfigCard: React.FC = () => {
  const { questions, homeShowcaseConfig, updateHomeShowcaseConfig } = useApp();
  const [editingCategory, setEditingCategory] = useState<HomeShowcaseCategory>(() =>
    homeShowcaseConfig.defaultCategory === 'proposals_software' ? 'proposals_software' : 'games'
  );
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [subFilter, setSubFilter] = useState<'all' | 'proposal' | 'software'>('all');
  const [isExpanded, setIsExpanded] = useState(false);

  const mode: 'custom' | 'views' =
    editingCategory === 'proposals_software'
      ? homeShowcaseConfig.hotProposalsMode || 'custom'
      : homeShowcaseConfig.hotGamesMode || 'custom';

  const rawIds: string[] =
    editingCategory === 'proposals_software'
      ? homeShowcaseConfig.hotProposalIds || []
      : homeShowcaseConfig.hotGameIds || [];

  const { byId, pool } = useMemo(() => {
    const map = new Map<string, Question>();
    if (editingCategory === 'games') {
      const seeds = getHotRankedGames(questions).map((x) => x.question);
      [...(questions || []).filter(isShowcaseGameQuestion), ...seeds].forEach((q) => {
        if (!map.has(q.id)) map.set(q.id, q);
      });
    } else {
      // 「提案與軟體」：只顯示「創新提案」與「遊戲以外軟體」
      const seeds = getHotRankedProposalsAndSoftware(questions).map((x) => x.question);
      const proposalsAndSoftware = (questions || []).filter(isShowcaseProposalOrSoftwareQuestion);
      [...seeds, ...proposalsAndSoftware].forEach((q) => {
        if (!map.has(q.id)) map.set(q.id, q);
      });
    }
    return {
      byId: map,
      pool: [...map.values()],
    };
  }, [questions, editingCategory]);

  // 嚴格確保自選清單只保留屬於當前分類的項目
  const ids = useMemo(
    () =>
      rawIds.filter((id) => {
        const q = byId.get(id);
        if (!q) return false;
        return editingCategory === 'games'
          ? isShowcaseGameQuestion(q)
          : isShowcaseProposalOrSoftwareQuestion(q);
      }),
    [rawIds, byId, editingCategory]
  );

  const selected = ids.map((id) => byId.get(id)).filter((q): q is Question => Boolean(q));
  const results = pool.filter(
    (q) =>
      !ids.includes(q.id) &&
      (editingCategory !== 'proposals_software' ||
        subFilter === 'all' ||
        (subFilter === 'proposal' ? q.postType === 'innovation_proposal' : q.postType !== 'innovation_proposal')) &&
      (!query.trim() ||
        `${q.title} ${q.authorName || ''} ${(q.tags || []).join(' ')}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()))
  );

  const save = async (patch: Partial<HomeShowcaseConfig>) => {
    setSaving(true);
    await updateHomeShowcaseConfig(patch);
    setSaving(false);
  };

  const setCategoryMode = (nextMode: 'custom' | 'views') => {
    if (editingCategory === 'proposals_software') {
      void save({ hotProposalsMode: nextMode });
    } else {
      void save({ hotGamesMode: nextMode });
    }
  };

  const setCategoryIds = (nextIds: string[]) => {
    if (editingCategory === 'proposals_software') {
      void save({ hotProposalIds: nextIds });
    } else {
      void save({ hotGameIds: nextIds });
    }
  };

  const move = (index: number, delta: -1 | 1) => {
    const next = [...ids];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setCategoryIds(next);
  };

  const title = (q: Question) => stripAppNameFromTitle(q.title, q.appName);
  const editingCatLabel = editingCategory === 'proposals_software' ? '創新與軟體' : '遊戲';

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
                創新與軟體：{homeShowcaseConfig.hotProposalsMode === 'views' ? '依瀏覽數' : `自選 ${(homeShowcaseConfig.hotProposalIds || []).length}/10`}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-rose-800 border border-rose-200">
                遊戲：{homeShowcaseConfig.hotGamesMode === 'views' ? '依瀏覽數' : `自選 ${(homeShowcaseConfig.hotGameIds || []).length}/10`}
              </span>
              <span className="text-[10px] text-rose-700/70 font-normal">
                {isExpanded ? '（點擊收合）' : '（點擊展開設定）'}
              </span>
            </h4>
            <p className="text-xs text-rose-900/70 mt-0.5 line-clamp-1">
              分為「創新與軟體」與「遊戲」兩類，可分別設定首頁熱度榜排序方式與自選 TOP 10 順序。
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
          {/* 選擇要編輯的熱度榜分類 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-white border border-rose-200">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black text-rose-950">選擇要編輯的熱度榜分類：</span>
              <div className="inline-flex items-center p-0.5 rounded-xl bg-rose-50 border border-rose-200">
                <button
                  type="button"
                  onClick={() => setEditingCategory('proposals_software')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                    editingCategory === 'proposals_software'
                      ? 'bg-sky-600 text-white shadow-2xs'
                      : 'text-rose-900 hover:bg-rose-100/70'
                  }`}
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span>編輯「創新與軟體」</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditingCategory('games')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                    editingCategory === 'games'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'text-rose-900 hover:bg-rose-100/70'
                  }`}
                >
                  <Gamepad2 className="w-3.5 h-3.5" />
                  <span>編輯「遊戲」</span>
                </button>
              </div>
            </div>
            <span className="text-[11px] font-bold text-stone-500">
              {editingCategory === 'games' ? '清單僅顯示「遊戲」作品' : '清單僅顯示「創新提案」與「遊戲以外軟體」'}
            </span>
          </div>

          <p className="text-xs text-rose-900/80 leading-relaxed">
            目前正在編輯<strong>「{editingCatLabel}」</strong>熱度榜。可選擇手動編排榜單（自由搜尋並調整前 10 名次序，不足 10 名時由熱門作品自動補齊），或依「{editingCatLabel}」作品的瀏覽次數即時由高至低自動排序。
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {([
              { id: 'custom' as const, label: `管理員自選（${editingCatLabel}）`, detail: '自行挑選並調整前 10 名', icon: <Flame className="w-4 h-4" /> },
              { id: 'views' as const, label: `依瀏覽次數排序（${editingCatLabel}）`, detail: `「${editingCatLabel}」依瀏覽數由高至低排列`, icon: <Eye className="w-4 h-4" /> },
            ]).map((option) => (
              <button key={option.id} type="button" disabled={saving} onClick={() => setCategoryMode(option.id)}
                className={`text-left p-3 rounded-xl border flex items-center gap-2.5 transition-colors cursor-pointer disabled:opacity-60 ${mode === option.id ? 'bg-white border-rose-400 ring-2 ring-rose-200 shadow-2xs' : 'bg-white/60 border-stone-200 hover:border-rose-300'}`}>
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${mode === option.id ? 'bg-rose-100 text-rose-700' : 'bg-stone-100 text-stone-500'}`}>{option.icon}</span>
                <span><span className="block text-xs font-black text-stone-900">{option.label}</span><span className="block text-[11px] text-stone-500">{option.detail}</span></span>
                {mode === option.id && <Check className="w-4 h-4 text-rose-600 ml-auto" />}
              </button>
            ))}
          </div>

          {mode === 'custom' && (
            <div className="rounded-xl border border-rose-200 bg-white p-3 space-y-2.5">
              <div className="flex justify-between items-center text-xs font-black text-rose-950">
                <span>「{editingCatLabel}」自選榜單排序</span>
                <span>{ids.length}/10</span>
              </div>
              {selected.length > 0 && <div className="space-y-1 max-h-56 overflow-y-auto">
                {selected.map((q, i) => <div key={q.id} className="flex items-center gap-2 rounded-lg bg-rose-50 px-2 py-1.5">
                  <span className="w-5 text-center text-[11px] font-mono font-black text-rose-700">{i + 1}</span>
                  <span className="px-1.5 py-0.5 rounded bg-white border border-rose-200 text-[10px] font-bold text-rose-800 shrink-0">{getItemCategoryBadge(q)}</span>
                  <span className="min-w-0 flex-1 truncate text-xs font-bold">{title(q)}</span>
                  <button type="button" disabled={saving || i === 0} onClick={() => move(i, -1)} aria-label="上移" className="p-1 text-rose-700 disabled:opacity-30 cursor-pointer"><ArrowUp className="w-3.5 h-3.5" /></button>
                  <button type="button" disabled={saving || i === selected.length - 1} onClick={() => move(i, 1)} aria-label="下移" className="p-1 text-rose-700 disabled:opacity-30 cursor-pointer"><ArrowDown className="w-3.5 h-3.5" /></button>
                  <button type="button" disabled={saving} onClick={() => setCategoryIds(ids.filter((id) => id !== q.id))} aria-label="移除" className="p-1 text-stone-400 hover:text-red-600 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                </div>)}
              </div>}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[12rem]">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={`搜尋「${editingCatLabel}」名稱、作者或標籤`}
                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-stone-200 bg-stone-50 text-xs outline-none focus:border-rose-400"
                  />
                </div>
                {editingCategory === 'proposals_software' ? (
                  <div className="inline-flex rounded-lg border border-stone-200 p-0.5 bg-stone-50 text-[11px] font-bold">
                    {([
                      { id: 'all' as const, label: '全部（提案＋軟體）' },
                      { id: 'proposal' as const, label: '創新提案' },
                      { id: 'software' as const, label: '遊戲以外軟體' },
                    ]).map((s) => (
                      <button key={s.id} type="button" onClick={() => setSubFilter(s.id)} className={`px-2 py-1 rounded-md cursor-pointer ${subFilter === s.id ? 'bg-white text-rose-800 shadow-2xs' : 'text-stone-500'}`}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <span className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-[11px] font-bold text-amber-800">
                    僅顯示遊戲作品
                  </span>
                )}
              </div>
              <div className="max-h-52 overflow-y-auto divide-y divide-stone-100 border border-stone-100 rounded-lg">
                {results.map((q) => <button key={q.id} type="button" disabled={saving || ids.length >= 10} onClick={() => setCategoryIds([...ids, q.id])} className="w-full px-2.5 py-2 flex items-center gap-2 text-left hover:bg-rose-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed">
                  <span className="text-rose-600 font-black">＋</span>
                  <span className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-700 text-[10px] font-bold shrink-0">{getItemCategoryBadge(q)}</span>
                  <span className="truncate text-xs font-bold">{title(q)}</span>
                  <span className="ml-auto shrink-0 text-[10px] text-stone-400">瀏覽 {q.viewsCount ?? q.views ?? 0}</span>
                </button>)}
                {results.length === 0 && <div className="px-3 py-4 text-center text-[11px] text-stone-400">沒有其他符合的「{editingCatLabel}」項目</div>}
              </div>
            </div>
          )}
          <p className="text-[11px] text-rose-900/70">{saving ? '儲存中…' : `設定會同步儲存並套用於首頁「${editingCatLabel}」熱度榜。`}</p>
        </div>
      )}
    </div>
  );
};

export default AdminHomeShowcaseCard;


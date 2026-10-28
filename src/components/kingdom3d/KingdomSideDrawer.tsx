import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { SosoState } from './useSosoJobs';
import { X, ChevronRight, ChevronLeft, ArrowRight, Compass, Store, PenLine } from 'lucide-react';
import type { Question } from '../../types';
import type { BuildingInteractable } from './types';
import { isGameQuestion } from '../../utils/gameClassification';
import { painForFloor } from './PainFloorModal';
import { PAIN_FLOORS } from './stylized/painBoard';
import { STREET_PROPS, StreetProp, StallContent } from './stylized/streets';
import { actionsForBuilding, KingdomAction, KingdomActionButton, FEATURE_INFO, openInNewTab } from './buildingActions';
import { isTypingTarget } from './FirstPersonControls';
import { hallOf, hallZoneItems, HALL_ZONES } from './stylized/exhibitHall';
import { CHARACTERS, CharacterId } from './stylized/fauna';
import { plazaTopics } from './stylized/discussionPlaza';
import './kingdomUi.css';

/** 左側面板目前顯示的內容（照 /island：點畫面上的東西，細節在左側彈出） */
export type DrawerState =
  | { kind: 'building'; building: BuildingInteractable }
  | { kind: 'painFloor'; level: number }
  | { kind: 'street'; propId: string }
  | { kind: 'desk' }
  | { kind: 'soso' }
  | { kind: 'jobs' }
  | { kind: 'job'; index: number }
  | { kind: 'feature'; id: 'stage' | 'proposal' }
  | { kind: 'question'; question: Question; back: DrawerState | null }
  /** 展覽館、電玩城地下主展場的某個展區：列出全部作品 */
  | { kind: 'hallZone'; buildingId: string; zone: number }
  /** 展覽館、電玩城一樓：精選榜／熱度榜 */
  | { kind: 'hallRank'; buildingId: string; which: 'featured' | 'hot' }
  /** 創點源原創角色小卡 */
  | { kind: 'character'; id: CharacterId }
  /** 討論島論道廣場：議題碑上的討論（熱門／最新） */
  | { kind: 'discList'; which: 'hot' | 'new' }
  /** 其他旅人：看名字、邀請綁定羈絆 */
  | { kind: 'player'; id: string; name: string };

const ALL_PROPS: StreetProp[] = Object.values(STREET_PROPS).flat();
export const findStreetProp = (id: string) => ALL_PROPS.find((p) => p.id === id) || null;

const visible = (q: Question) => q.status !== 'delisted' && !(q as any).isDelisted;
const isWork = (q: Question) => q.postType === 'vibecoding_app' || q.postType === 'innovation_proposal' || isGameQuestion(q);
const time = (q: Question) => Date.parse(q.createdAt) || 0;

export function hotScore(q: Question): number {
  const views = q.viewsCount ?? q.views ?? 0;
  const likes = (q as any).likesCount ?? q.likes ?? 0;
  const discs = q.discussionsCount ?? (q.discussions ? q.discussions.length : 0);
  const sols = q.solutionsCount ?? (q.solutions ? q.solutions.length : 0);
  return views + likes * 5 + discs * 8 + sols * 10;
}

export function stallItems(questions: Question[], content: StallContent): Question[] {
  const pool = questions.filter(visible);
  const discPool = pool.filter((q) => q.postType === 'chat_discussion' || (!q.postType && !isGameQuestion(q)));
  const matchDisc = (re: RegExp, subcat?: string, cat?: string) => {
    const exact = discPool.filter((q) => {
      if (subcat && q.subcategory === subcat) return true;
      const hay = `${q.title || ''} ${q.description || ''} ${q.category || ''} ${q.subcategory || ''} ${(q.tags || []).join(' ')}`;
      return re.test(hay);
    });
    if (exact.length > 0) return exact.sort((a, b) => time(b) - time(a));
    if (cat) {
      const byCat = discPool.filter((q) => q.category === cat);
      if (byCat.length > 0) return byCat.sort((a, b) => time(b) - time(a));
    }
    return discPool.sort((a, b) => time(b) - time(a));
  };
  switch (content) {
    case 'proposal':
      return pool.filter((q) => q.postType === 'innovation_proposal').sort((a, b) => time(b) - time(a));
    case 'game':
      return pool.filter((q) => isGameQuestion(q)).sort((a, b) => time(b) - time(a));
    case 'app':
      return pool.filter((q) => q.postType === 'vibecoding_app' && !isGameQuestion(q)).sort((a, b) => time(b) - time(a));
    case 'hot':
      return pool.filter(isWork).sort((a, b) => (b.viewsCount ?? b.views ?? 0) - (a.viewsCount ?? a.views ?? 0));
    case 'tea_daily':
      return matchDisc(/日常|閒聊|交流|分享|心情|隨筆|家務|購物/i, undefined, '日常疑難');
    case 'tea_life':
      return matchDisc(/生活|情感|感情|心靈|健康|旅行|美食|休閒|慢調/i, '感情', '日常疑難');
    case 'tea_work':
      return matchDisc(/職場|工作|職涯|求職|轉職|管理|同事|人脈|商業/i, '職場', '日常疑難');
    case 'tea_idea':
      return matchDisc(/靈感|哲學|思維|創意|想法|探討|觀點|未來|時事/i, '時事', '學術探討');
    case 'tea_board':
      return matchDisc(/日常|生活|職場|靈感|閒聊|交流|家務|感情|時事/i, undefined, '日常疑難');
    case 'craft_plumbing':
      return matchDisc(/水電|管線|配線|漏水|跳電|插座|衛浴|馬達|水塔|電工|修繕/i, '水電', '專業問題');
    case 'craft_interior':
      return matchDisc(/室內裝修|裝修|裝潢|木工|油漆|泥作|系統櫃|設計|地板|隔音|採光|建材/i, '室內裝修', '專業問題');
    case 'craft_law':
      return matchDisc(/法律智財|法律|智財|專利|商標|著作權|合約|訴訟|法務|條款|糾紛|權益/i, '法律智財', '專業問題');
    case 'craft_tax':
      return matchDisc(/會計稅務|會計|稅務|報稅|發票|營業稅|營所稅|記帳|財務|節稅|審計|帳務/i, '會計稅務', '專業問題');
    case 'craft_mgmt':
      return matchDisc(/企業管理|管理|組織|人資|KPI|OKR|營運|策略|領導|流程|企業|制度/i, '企業管理', '專業問題');
    case 'craft_board':
      return matchDisc(/水電|室內裝修|法律智財|會計稅務|企業管理|專業|工程|實務/i, undefined, '專業問題');
    case 'new':
    default:
      return pool.filter(isWork).sort((a, b) => time(b) - time(a));
  }
}

/** 取得該類店鋪的「熱門討論」清單（依觀看、按讚、討論與解答熱度排序，供店鋪門前看板與抽屜輪播） */
export function hotStallItems(questions: Question[], content: StallContent): Question[] {
  return [...stallItems(questions, content)].sort((a, b) => hotScore(b) - hotScore(a));
}

const badgeOf = (q: Question) =>
  q.postType === 'pain_point'
    ? '痛點需求'
    : q.postType === 'innovation_proposal'
    ? '創新提案'
    : q.postType === 'chat_discussion'
    ? '交流討論'
    : isGameQuestion(q)
    ? '遊戲作品'
    : q.postType === 'vibecoding_app'
    ? '軟體作品'
    : '提問';

function Header({ title, badge, sub, onClose, onBack }: { title: string; badge?: string; sub?: string; onClose: () => void; onBack?: () => void }) {
  return (
    <div className="flex items-start gap-2 px-4 pt-4 pb-3" style={{ borderBottom: '1px solid rgba(226,184,90,0.3)' }}>
      {onBack && (
        <button type="button" onClick={onBack} className="kx-round w-8 h-8 shrink-0 mt-0.5" aria-label="返回上一層">
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="kx-title text-xl leading-tight">{title}</h3>
          {badge && (
            <span className="text-[11px] px-2 py-0.5 rounded" style={{ background: 'rgba(179,38,30,0.85)', color: '#fff0c8', border: '1px solid rgba(242,198,106,0.7)' }}>
              {badge}
            </span>
          )}
        </div>
        {sub && <p className="kx-sub text-[12.5px] mt-1">{sub}</p>}
      </div>
      <button type="button" onClick={onClose} className="kx-round w-8 h-8 shrink-0" title="關閉 (Esc)" aria-label="關閉">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function ActionList({ actions }: { actions: { label: string; hint?: string; primary?: boolean; run: () => void }[] }) {
  return (
    <div className="space-y-1.5">
      {actions.map((a, i) => (
        <button
          key={a.label}
          type="button"
          onClick={a.run}
          className="w-full text-left rounded-lg px-3 py-2.5 flex items-center gap-3 cursor-pointer transition-colors hover:bg-[rgba(226,184,90,0.16)]"
          style={{
            background: a.primary ? 'linear-gradient(90deg, rgba(179,38,30,0.55), rgba(179,38,30,0.25))' : 'rgba(0,0,0,0.22)',
            border: `1px solid ${a.primary ? 'rgba(242,198,106,0.7)' : 'rgba(226,184,90,0.22)'}`,
          }}
        >
          <span
            className="w-6 h-6 rounded-md shrink-0 flex items-center justify-center text-[12px] tabular-nums"
            style={{ background: 'rgba(0,0,0,0.35)', color: '#f2c94c', border: '1px solid rgba(226,184,90,0.4)' }}
            aria-hidden="true"
          >
            {i < 9 ? i + 1 : '•'}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px]" style={{ color: '#f6e7c4' }}>
              {a.label}
            </span>
            {a.hint && <span className="kx-sub block text-[12px] mt-0.5 truncate">{a.hint}</span>}
          </span>
          <ChevronRight className="w-4 h-4 shrink-0 text-amber-200/70" />
        </button>
      ))}
    </div>
  );
}

function QuestionRows({ list, onPick, empty }: { list: Question[]; onPick: (q: Question) => void; empty: string }) {
  if (!list.length) return <p className="kx-sub text-[13.5px] text-center py-8">{empty}</p>;
  return (
    <ul className="space-y-1.5">
      {list.map((q) => (
        <li key={q.id}>
          <button
            type="button"
            onClick={() => onPick(q)}
            className="w-full text-left rounded-lg px-3 py-2.5 flex items-center gap-3 cursor-pointer transition-colors hover:bg-[rgba(226,184,90,0.12)]"
            style={{ background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(226,184,90,0.18)' }}
          >
            {(q.cardDisplayImage || q.coverImage) && (
              <img src={q.cardDisplayImage || q.coverImage} alt="" className="w-11 h-11 rounded-md object-cover shrink-0" loading="lazy" />
            )}
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] truncate" style={{ color: '#f6e7c4' }}>
                {q.title || '（未命名）'}
              </span>
              <span className="kx-sub block text-[12px] mt-0.5 truncate">
                {q.category}
                {q.authorName ? `・${q.authorName}` : ''}
              </span>
            </span>
            {q.bounty > 0 && (
              <span className="shrink-0 text-[12px] tabular-nums" style={{ color: '#ffcf6a' }}>
                懸賞 {q.bounty.toLocaleString()}
              </span>
            )}
            <ChevronRight className="w-4 h-4 shrink-0 text-amber-200/70" />
          </button>
        </li>
      ))}
    </ul>
  );
}

/** 店鋪熱門討論自動輪播區塊（與 3D 店鋪門前走馬燈同步展示該分類熱門討論） */
function ShopHotCarousel({
  shopName,
  items,
  onPick,
}: {
  shopName: string;
  items: Question[];
  onPick: (q: Question) => void;
}) {
  const slides = items.slice(0, 5);
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    setIdx(0);
  }, [shopName, slides.length]);
  useEffect(() => {
    if (slides.length <= 1) return;
    const t = window.setInterval(() => {
      setIdx((prev) => (prev + 1) % slides.length);
    }, 3800);
    return () => window.clearInterval(t);
  }, [slides.length]);

  if (!slides.length) return null;
  const cur = slides[idx % slides.length];
  const views = cur.viewsCount ?? cur.views ?? 0;
  const replies = (cur.discussionsCount ?? (cur.discussions ? cur.discussions.length : 0)) + (cur.solutionsCount ?? (cur.solutions ? cur.solutions.length : 0));

  return (
    <div
      className="mx-4 mt-3 rounded-xl p-3 space-y-2"
      style={{
        background: 'linear-gradient(135deg, rgba(156,31,24,0.52), rgba(45,20,12,0.85))',
        border: '1.5px solid rgba(242,201,76,0.72)',
        boxShadow: '0 6px 18px rgba(0,0,0,0.35)',
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12.5px] font-bold flex items-center gap-1" style={{ color: '#fde68a' }}>
          🔥 {shopName}・熱門討論輪播
        </span>
        <div className="flex items-center gap-1.5">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setIdx(i)}
              className="w-2 h-2 rounded-full transition-all cursor-pointer"
              style={{
                background: i === idx % slides.length ? '#fbbf24' : 'rgba(246,231,196,0.3)',
                transform: i === idx % slides.length ? 'scale(1.25)' : 'scale(1)',
              }}
              aria-label={`第 ${i + 1} 則熱門討論`}
            />
          ))}
          <span className="text-[11px] tabular-nums ml-1" style={{ color: '#f6e7c4' }}>
            {idx + 1}/{slides.length}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onPick(cur)}
        className="w-full text-left rounded-lg px-3 py-2.5 cursor-pointer transition-colors hover:bg-[rgba(242,201,76,0.14)]"
        style={{ background: 'rgba(0,0,0,0.32)', border: '1px solid rgba(242,201,76,0.35)' }}
      >
        <div className="text-[14.5px] font-bold line-clamp-2 leading-snug" style={{ color: '#fff8dc' }}>
          {cur.title || '（未命名討論）'}
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2 text-[11.5px]" style={{ color: '#e7d3a5' }}>
          <span className="truncate">
            【{cur.subcategory || cur.category || '熱門'}】{cur.authorName || '創點源行家'}
          </span>
          <span className="shrink-0" style={{ color: '#fbbf24' }}>
            👁 {views} · 💬 {replies} ➔
          </span>
        </div>
      </button>
    </div>
  );
}

export const KingdomSideDrawer: React.FC<{
  state: DrawerState | null;
  questions: Question[];
  onChange: (s: DrawerState | null) => void;
  onAction: (a: KingdomAction) => void;
  onOpenQuestion: (q: Question) => void;
  /** 有提供時，點文章直接在左側顯示完整內頁（可滑動），不用離開 3D */
  renderQuestionPage?: (q: Question, back: () => void) => React.ReactNode;
  /** 求職廟搜搜的對話與結果 */
  soso?: { state: SosoState; send: (t: string) => void; search: (brief: string) => void; reset: () => void };
  /** 展覽館、電玩城一樓的精選榜、熱度榜（和首頁同一份） */
  rankings?: Record<string, { featured: Question[]; hot: Question[] }>;
  /** 羈絆（雙向綁定） */
  bond?: {
    online: boolean;
    partnerName: string | null;
    relationTo: (userKey: string) => 'partner' | 'invited' | 'inviting-me' | 'none';
    invite: (userKey: string) => void;
    release: () => void;
  };
}> = ({ state, questions, onChange, onAction, onOpenQuestion, renderQuestionPage, soso, rankings, bond }) => {
  const [draft, setDraft] = useState('');
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ block: 'end' });
  }, [soso?.state.msgs.length, state?.kind]);
  const close = () => onChange(null);
  const openQ = (q: Question) => onChange({ kind: 'question', question: q, back: state });

  // 目前面板上的按鈕（數字鍵 1～9 可直接選）
  type Act = { label: string; hint?: string; primary?: boolean; run: () => void };
  const actions = useMemo((): Act[] => {
    if (!state) return [];
    if (state.kind === 'building') {
      const b = state.building;
      return actionsForBuilding(b.id, b.targetModule, b.mockData?.primaryActionLabel).map((a: KingdomActionButton) => ({
        ...a,
        run: () => (a.action.kind === 'painFloor' ? onChange({ kind: 'painFloor', level: a.action.level }) : onAction(a.action)),
      }));
    }
    if (state.kind === 'feature') {
      return FEATURE_INFO[state.id].actions.map((a) => ({ ...a, run: () => onAction(a.action) }));
    }
    if (state.kind === 'painFloor') {
      return PAIN_FLOORS.map((f, i) => ({ label: f.label, hint: f.sub, primary: i === state.level, run: () => onChange({ kind: 'painFloor', level: i }) }));
    }
    if (state.kind === 'street') {
      const p = findStreetProp(state.propId);
      if (p?.kind === 'gate' && p.regionId === 'region-creative') {
        return STREET_PROPS[p.regionId]
          .filter((s) => s.kind === 'stall')
          .map((s) => ({ label: s.name, hint: s.sub, run: () => onChange({ kind: 'street', propId: s.id }) }));
      }
      if (p?.kind === 'gate' && p.regionId === 'region-discussion') {
        const isTea = p.id.includes('tea');
        return STREET_PROPS[p.regionId]
          .filter((s) => s.kind !== 'gate' && (isTea ? s.id.includes('tea') : s.id.includes('craft')))
          .map((s) => ({ label: s.name, hint: s.sub, run: () => onChange({ kind: 'street', propId: s.id }) }));
      }
    }
    return [];
  }, [state, onAction, onChange]);

  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        if (state.kind === 'question' && state.back) onChange(state.back);
        else onChange(null);
        return;
      }
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= 9 && actions[n - 1]) {
        e.preventDefault();
        actions[n - 1].run();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state, actions, onChange]);

  let body: React.ReactNode = null;
  if (state?.kind === 'building') {
    const b = state.building;
    body = (
      <>
        <Header title={b.name.replace(/[（(].*$/, '')} badge={b.previewBadge} sub={b.subtitle} onClose={close} />
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          <ActionList actions={actions} />
          <p className="kx-sub text-[13px] leading-relaxed">{b.description}</p>
          {b.previewFeatures.length > 0 && (
            <ul className="space-y-1">
              {b.previewFeatures.map((f) => (
                <li key={f} className="kx-sub text-[12.5px] flex gap-2">
                  <span className="text-amber-300">・</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          )}
          {b.mockData?.notice && (
            <div className="rounded-lg px-3 py-2 text-[12.5px]" style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(226,184,90,0.2)' }}>
              <p className="flex items-center gap-1.5 kx-sub">
                <Compass className="w-3.5 h-3.5 shrink-0" /> {b.mockData.notice}
              </p>
            </div>
          )}
        </div>
      </>
    );
  } else if (state?.kind === 'painFloor') {
    const floor = PAIN_FLOORS[state.level] || PAIN_FLOORS[0];
    const list = painForFloor(questions, state.level);
    body = (
      <>
        <Header title={`創點樓・${floor.label}`} badge="懸賞牆" sub={`${floor.sub}・共 ${list.length} 則`} onClose={close} />
        <div className="px-4 pt-3">
          <div className="grid grid-cols-3 gap-1.5">
            {actions.map((a, i) => (
              <button
                key={a.label}
                type="button"
                onClick={a.run}
                className="rounded-md px-1 py-1.5 text-[12px] cursor-pointer"
                style={{
                  background: a.primary ? 'rgba(179,38,30,0.75)' : 'rgba(0,0,0,0.25)',
                  border: `1px solid ${a.primary ? 'rgba(242,198,106,0.8)' : 'rgba(226,184,90,0.25)'}`,
                  color: '#f6e7c4',
                }}
              >
                {i + 1}・{PAIN_FLOORS[i]?.short || a.label.replace(/・.*/, '')}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <QuestionRows list={list.slice(0, 60)} onPick={openQ} empty="這層還沒有痛點，歡迎刊登第一則！" />
        </div>
        <div className="px-4 py-3 flex items-center justify-between gap-2" style={{ borderTop: '1px solid rgba(226,184,90,0.3)' }}>
          <span className="kx-sub text-[12px]">正反面佈告欄與迴廊皆可張貼</span>
          <button type="button" onClick={() => onAction({ kind: 'module', module: 'create_pain_point' })} className="kx-btn-primary px-4 py-2 text-[13.5px] flex items-center gap-1.5 cursor-pointer shrink-0">
            <PenLine className="w-4 h-4" /> 張貼／刊登痛點
          </button>
        </div>
      </>
    );
  } else if (state?.kind === 'street') {
    const p = findStreetProp(state.propId);
    if (p?.kind === 'gate' && p.regionId === 'region-creative') {
      body = (
        <>
          <Header title={`${p.name}市集`} badge="創意島" sub={p.sub} onClose={close} />
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            <p className="kx-sub text-[13px] leading-relaxed">創意集的攤位預留給合作夥伴（遊戲或提案）進駐：會在這裡刊登，並享有更客製化的攤位場景，點擊遊玩或體驗會直接連到掌櫃的網站。歡迎掌櫃進駐！</p>
            <ActionList actions={actions} />
          </div>
        </>
      );
    } else if (p?.kind === 'gate' && p.regionId === 'region-discussion') {
      body = (
        <>
          <Header title={p.name} badge="討論島・街區" sub={p.sub} onClose={close} />
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            <p className="kx-sub text-[13px]">{p.note}</p>
            <ActionList actions={actions} />
          </div>
          <div className="px-4 py-3 flex justify-end gap-2" style={{ borderTop: '1px solid rgba(226,184,90,0.3)' }}>
            <button
              type="button"
              onClick={() => onAction({ kind: 'module', module: 'create_discussion' })}
              className="kx-btn-primary px-4 py-2 text-[13.5px] flex items-center gap-1.5 cursor-pointer"
            >
              <PenLine className="w-4 h-4" /> 發起討論
            </button>
          </div>
        </>
      );
    } else if (p && p.content) {
      const list = stallItems(questions, p.content);
      const hotList = hotStallItems(questions, p.content);
      const isDiscProp = p.regionId === 'region-discussion';
      const isCraft = p.id.includes('craft');
      const isBoard = p.kind === 'board';
      const unit = isDiscProp ? '則討論' : '件';
      const siblingShops = isDiscProp
        ? STREET_PROPS['region-discussion'].filter((s) => s.kind === 'shop' && (isCraft ? s.id.includes('craft') : s.id.includes('tea')))
        : [];
      body = (
        <>
          <Header
            title={p.name}
            badge={isDiscProp ? (isBoard ? '街道佈告欄' : isCraft ? '百工坊・店鋪' : '茶藝街・茶館') : '創意集'}
            sub={`${p.sub || ''}・共 ${list.length} ${unit}`}
            onClose={close}
            onBack={() => {
              const gate = STREET_PROPS[p.regionId].find((s) =>
                s.kind === 'gate' && (isDiscProp ? (p.id.includes('tea') ? s.id.includes('tea') : s.id.includes('craft')) : true)
              );
              onChange(gate ? { kind: 'street', propId: gate.id } : null);
            }}
          />
          {isDiscProp && siblingShops.length > 0 && (
            <div className="px-4 pt-2.5 flex flex-wrap gap-1.5">
              {siblingShops.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onChange({ kind: 'street', propId: s.id })}
                  className="rounded-md px-2 py-1 text-[12px] cursor-pointer transition-colors"
                  style={{
                    background: s.id === p.id ? 'rgba(179,38,30,0.82)' : 'rgba(0,0,0,0.28)',
                    border: `1px solid ${s.id === p.id ? 'rgba(242,198,106,0.85)' : 'rgba(226,184,90,0.25)'}`,
                    color: '#f6e7c4',
                  }}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
          {isDiscProp && <ShopHotCarousel shopName={p.name.replace(/佈告欄・|討論欄・/, '')} items={hotList} onPick={openQ} />}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            <QuestionRows list={list.slice(0, 40)} onPick={openQ} empty={isDiscProp ? '這間店鋪目前還沒有對應討論，歡迎發起第一則討論！' : '這個攤位還沒有擺上作品。'} />
          </div>
          {isDiscProp && (
            <div className="px-4 py-3 flex items-center justify-between gap-2" style={{ borderTop: '1px solid rgba(226,184,90,0.3)' }}>
              <span className="kx-sub text-[12px]">街旁兩排佈告欄同步張貼・店門輪播熱門</span>
              <button
                type="button"
                onClick={() => onAction({ kind: 'module', module: 'create_discussion' })}
                className="kx-btn-primary px-4 py-2 text-[13.5px] flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <PenLine className="w-4 h-4" /> 發起討論
              </button>
            </div>
          )}
        </>
      );
    } else if (p) {
      const badge = p.regionId === 'region-discussion' ? '討論島' : p.regionId === 'region-creative' ? '創意集' : '貿易街';
      body = (
        <>
          <Header
            title={p.name}
            badge={badge}
            sub={p.partner ? p.sub : p.vacant ? '空鋪・歡迎掌櫃進駐' : p.sub}
            onClose={close}
            onBack={
              p.kind === 'stall' && p.regionId === 'region-creative'
                ? () => {
                    const gate = STREET_PROPS[p.regionId].find((x) => x.kind === 'gate');
                    onChange(gate ? { kind: 'street', propId: gate.id } : null);
                  }
                : undefined
            }
          />
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            <p className="kx-sub text-[13.5px] leading-relaxed flex gap-2">
              <Store className="w-4 h-4 shrink-0 mt-0.5 text-amber-300" />
              {p.note || '這裡目前是街景。'}
            </p>
            {p.partner?.url && (
              <button
                type="button"
                onClick={() => openInNewTab(p.partner!.url!)}
                className="kx-btn-primary w-full px-4 py-2.5 text-[14px] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {p.partner.kind === 'game' ? '前往遊玩' : p.partner.kind === 'service' ? '查看服務' : '前往體驗'}（新分頁）
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </>
      );
    }
  } else if (state?.kind === 'hallZone') {
    const h = hallOf(state.buildingId);
    const isLib = h?.kind === 'library';
    const zones = h ? HALL_ZONES[h.kind] : [];
    const zone = zones[state.zone];
    const list = hallZoneItems(state.buildingId, state.zone, questions);
    if (h && zone) {
      body = (
        <>
          <Header title={zone.name} badge={h.title} sub={`${zone.sub}・共 ${list.length} ${isLib ? '冊' : '件'}`} onClose={close} />
          <div className="px-4 pt-3">
            <div className={`grid gap-1.5 ${zones.length > 3 ? 'grid-cols-4' : 'grid-cols-3'}`}>
              {zones.map((z, i) => (
                <button
                  key={z.key}
                  type="button"
                  onClick={() => onChange({ kind: 'hallZone', buildingId: state.buildingId, zone: i })}
                  className="rounded-md px-1 py-1.5 text-[12px] cursor-pointer truncate"
                  style={{
                    background: i === state.zone ? 'rgba(179,38,30,0.75)' : 'rgba(0,0,0,0.25)',
                    border: `1px solid ${i === state.zone ? 'rgba(242,198,106,0.8)' : 'rgba(226,184,90,0.25)'}`,
                    color: '#f6e7c4',
                  }}
                >
                  {h.mode === 'floors' ? `B${i + 1}・` : ''}
                  {z.name.replace(/展場|展區|・.*/, '')}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3">
            <QuestionRows
              list={list.slice(0, 80)}
              onPick={openQ}
              empty={isLib ? '此分類書架尚無討論典籍，歡迎發起第一則討論！' : '這個展區還沒有作品，歡迎上架第一件！'}
            />
          </div>
          <div className="px-4 py-3 flex justify-end gap-2" style={{ borderTop: '1px solid rgba(226,184,90,0.3)' }}>
            <button
              type="button"
              onClick={() =>
                onAction({
                  kind: 'module',
                  module: isLib ? 'create_discussion' : zone.key === 'proposal' ? 'create_proposal' : 'create_app',
                })
              }
              className="kx-btn-primary px-4 py-2 text-[13.5px] flex items-center gap-1.5 cursor-pointer"
            >
              <PenLine className="w-4 h-4" /> {isLib ? '發起討論' : zone.key === 'proposal' ? '發表創新提案' : '上架作品'}
            </button>
          </div>
        </>
      );
    }
  } else if (state?.kind === 'hallRank') {
    const h = hallOf(state.buildingId);
    const r = rankings?.[state.buildingId];
    const list = (state.which === 'featured' ? r?.featured : r?.hot) || [];
    body = (
      <>
        <Header
          title={state.which === 'featured' ? '精選榜' : '熱度榜'}
          badge={h ? `${h.title}・一樓大廳` : undefined}
          sub={h?.showcase === 'games' ? '遊戲 TOP 10（和首頁同一份榜單）' : '提案與軟體 TOP 10（和首頁同一份榜單）'}
          onClose={close}
        />
        <div className="px-4 pt-3">
          <div className="grid grid-cols-2 gap-1.5">
            {(['featured', 'hot'] as const).map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => onChange({ kind: 'hallRank', buildingId: state.buildingId, which: w })}
                className="rounded-md px-1 py-1.5 text-[12.5px] cursor-pointer"
                style={{
                  background: w === state.which ? 'rgba(179,38,30,0.75)' : 'rgba(0,0,0,0.25)',
                  border: `1px solid ${w === state.which ? 'rgba(242,198,106,0.8)' : 'rgba(226,184,90,0.25)'}`,
                  color: '#f6e7c4',
                }}
              >
                {w === 'featured' ? '精選榜' : '熱度榜'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <QuestionRows list={list} onPick={openQ} empty="榜單整理中。" />
        </div>
      </>
    );
  } else if (state?.kind === 'soso' && soso) {
    const st = soso.state;
    const submit = () => {
      if (!draft.trim() || st.busy) return;
      soso.send(draft);
      setDraft('');
    };
    body = (
      <>
        <Header title="搜搜・問職缺" badge="求職廟" sub="用自己的話說想找的工作，結果寫在兩旁畫卷（只有你看得到）" onClose={close} />
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {st.msgs.map((m, i) => (
            <div key={i} className={`flex ${m.from === 'me' ? 'justify-end' : 'justify-start'}`}>
              <p
                className="max-w-[85%] rounded-xl px-3 py-2 text-[13.5px] leading-relaxed whitespace-pre-line"
                style={m.from === 'me' ? { background: 'rgba(179,38,30,0.75)', color: '#fff0c8' } : { background: 'rgba(0,0,0,0.3)', color: '#f6e7c4', border: '1px solid rgba(226,184,90,0.25)' }}
              >
                {m.text}
              </p>
            </div>
          ))}
          {st.busy && <p className="kx-sub text-[12.5px]">{st.status === 'loading' ? '搜搜騰雲駕霧找職缺中…' : '搜搜想一想…'}</p>}
          <div ref={chatEndRef} />
        </div>
        <div className="px-4 py-3 space-y-2" style={{ borderTop: '1px solid rgba(226,184,90,0.3)' }}>
          {(st.canSearch || st.jobs.length > 0) && (
            <div className="flex flex-wrap gap-1.5">
              {st.canSearch && st.brief && (
                <button type="button" disabled={st.busy} onClick={() => soso.search(st.brief)} className="kx-btn-ghost px-3 py-1.5 text-[12.5px] cursor-pointer disabled:opacity-50">
                  就照這個條件找
                </button>
              )}
              {st.jobs.length > 0 && (
                <button type="button" onClick={() => onChange({ kind: 'jobs' })} className="kx-btn-ghost px-3 py-1.5 text-[12.5px] cursor-pointer">
                  看找到的職缺（{st.jobs.length}）
                </button>
              )}
              <button type="button" disabled={st.busy} onClick={soso.reset} className="kx-btn-ghost px-3 py-1.5 text-[12.5px] cursor-pointer disabled:opacity-50">
                重新開始
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  submit();
                }
              }}
              rows={2}
              maxLength={600}
              placeholder="例如：台北的前端工程師，月薪五萬以上"
              className="flex-1 resize-none rounded-lg px-3 py-2 text-[14px] outline-none"
              style={{ background: 'rgba(0,0,0,0.35)', color: '#f6e7c4', border: '1px solid rgba(226,184,90,0.35)' }}
            />
            <button type="button" onClick={submit} disabled={st.busy || !draft.trim()} className="kx-btn-primary px-4 text-[14px] cursor-pointer disabled:opacity-50 shrink-0">
              送出
            </button>
          </div>
        </div>
      </>
    );
  } else if (state?.kind === 'jobs' && soso) {
    const st = soso.state;
    body = (
      <>
        <Header title="搜搜找到的職缺" badge="求職廟" sub={st.brief ? `條件：${st.brief}` : undefined} onClose={close} onBack={() => onChange({ kind: 'soso' })} />
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {st.jobs.length === 0 ? (
            <p className="kx-sub text-[13.5px] text-center py-8">還沒有結果，先跟搜搜說說想找的工作。</p>
          ) : (
            <ul className="space-y-1.5">
              {st.jobs.map((j, idx) => (
                <li key={j.id || `${j.title}-${idx}`}>
                  <button
                    type="button"
                    onClick={() => onChange({ kind: 'job', index: idx })}
                    className="w-full text-left rounded-lg px-3 py-2.5 flex items-center gap-2 cursor-pointer transition-colors hover:bg-[rgba(226,184,90,0.12)]"
                    style={{ background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(226,184,90,0.18)' }}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] truncate" style={{ color: '#f6e7c4' }}>
                        {j.title}
                      </span>
                      <span className="kx-sub block text-[12px] mt-0.5 truncate">{[j.company, j.location, j.salaryText, j.sourcePlatform].filter(Boolean).join('・')}</span>
                    </span>
                    <ChevronRight className="w-4 h-4 shrink-0 text-amber-200/70" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="px-4 py-3 flex justify-end" style={{ borderTop: '1px solid rgba(226,184,90,0.3)' }}>
          <button type="button" onClick={() => onAction({ kind: 'module', module: 'jobs' })} className="kx-btn-ghost px-3 py-1.5 text-[12.5px] cursor-pointer">
            到匯職缺看更多（新分頁）
          </button>
        </div>
      </>
    );
  } else if (state?.kind === 'job' && soso) {
    const j = soso.state.jobs[state.index];
    if (j) {
      const rows: [string, string | undefined][] = [
        ['公司', j.company],
        ['地點', j.location],
        ['薪資', j.salaryText],
        ['經歷', j.experience],
        ['學歷', j.education],
        ['產業', [j.industry, j.category].filter(Boolean).join('・') || undefined],
        ['工作環境', j.workEnvironment],
        ['刊登', j.postedAtText],
        ['來源', j.sourcePlatform],
      ];
      body = (
        <>
          <Header title={j.title} badge="職缺" onClose={close} onBack={() => onChange({ kind: 'jobs' })} />
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            <dl className="grid grid-cols-[4.5em_1fr] gap-x-2 gap-y-1.5 text-[13px]">
              {rows
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <React.Fragment key={k}>
                    <dt className="kx-sub">{k}</dt>
                    <dd style={{ color: '#f6e7c4' }}>{v}</dd>
                  </React.Fragment>
                ))}
            </dl>
            {j.description && (
              <div>
                <p className="kx-title text-[14px] mb-1">工作內容</p>
                <p className="text-[13.5px] leading-relaxed whitespace-pre-line" style={{ color: '#efe0bd' }}>
                  {j.description}
                </p>
              </div>
            )}
            {j.benefits && (
              <div>
                <p className="kx-title text-[14px] mb-1">福利</p>
                <p className="text-[13.5px] leading-relaxed whitespace-pre-line" style={{ color: '#efe0bd' }}>
                  {j.benefits}
                </p>
              </div>
            )}
          </div>
          <div className="px-4 py-3 space-y-2" style={{ borderTop: '1px solid rgba(226,184,90,0.3)' }}>
            {j.url && (
              <a href={j.url} target="_blank" rel="noopener noreferrer" className="kx-btn-primary w-full px-4 py-2.5 text-[14px] flex items-center justify-center gap-1.5">
                {j.urlKind === 'search' ? '到來源網站搜尋這個職缺（新分頁）' : '前往原始職缺頁（新分頁）'} <ArrowRight className="w-4 h-4" />
              </a>
            )}
            <button type="button" onClick={() => onChange({ kind: 'jobs' })} className="kx-btn-ghost w-full px-4 py-2 text-[13px] cursor-pointer">
              回到全部結果
            </button>
          </div>
        </>
      );
    }
  } else if (state?.kind === 'player') {
    const userKey = state.id.split('/')[0];
    const rel = bond?.relationTo(userKey) || 'none';
    body = (
      <>
        <Header title={state.name} badge="旅人" sub="和你一起在五島漫遊的旅人" onClose={close} />
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {!bond?.online ? (
            <p className="kx-sub text-[13px]">多人連線中斷，暫時無法綁定羈絆。</p>
          ) : rel === 'partner' ? (
            <>
              <p className="text-[14px]" style={{ color: '#f6e7c4' }}>你們已是羈絆夥伴，兩人之間有一條發光的羈絆線。一起去遊船、登上聚雲塔、在各地一起遊覽，完成雙人任務吧！</p>
              <button type="button" onClick={() => bond.release()} className="kx-btn-ghost w-full px-4 py-2 text-[13.5px] cursor-pointer">
                解除羈絆
              </button>
            </>
          ) : rel === 'inviting-me' ? (
            <>
              <p className="text-[14px]" style={{ color: '#f6e7c4' }}>{state.name} 邀請你綁定羈絆。</p>
              {bond.partnerName && <p className="kx-sub text-[12px]">接受後會解除和 {bond.partnerName} 的羈絆。</p>}
              <button type="button" onClick={() => bond.invite(userKey)} className="kx-btn-primary w-full px-4 py-2.5 text-[14px] cursor-pointer">
                接受，綁定羈絆
              </button>
            </>
          ) : rel === 'invited' ? (
            <>
              <p className="text-[14px]" style={{ color: '#f6e7c4' }}>已送出羈絆邀請，等 {state.name} 接受。</p>
              <button type="button" onClick={() => bond.release()} className="kx-btn-ghost w-full px-4 py-2 text-[13.5px] cursor-pointer">
                取消邀請
              </button>
            </>
          ) : (
            <>
              <p className="kx-sub text-[13px] leading-relaxed">
                邀請對方綁定羈絆：對方接受後，兩人之間會出現一條發光的羈絆線，可以一起完成雙人任務（一起遊船、一起登上聚雲塔、在指定地點一起遊覽 5 分鐘）。同一時間只能和一位旅人綁定。
              </p>
              {bond.partnerName && <p className="kx-sub text-[12px]">送出邀請會先解除和 {bond.partnerName} 的羈絆。</p>}
              <button type="button" onClick={() => bond.invite(userKey)} className="kx-btn-primary w-full px-4 py-2.5 text-[14px] cursor-pointer">
                邀請綁定羈絆
              </button>
            </>
          )}
        </div>
      </>
    );
  } else if (state?.kind === 'discList') {
    const list = plazaTopics(questions, state.which).slice(0, 40);
    body = (
      <>
        <Header title={state.which === 'hot' ? '熱門議題' : '最新議題'} badge="討論島・論道廣場" sub="藏書閣門前的議題碑，刻著站上的討論" onClose={close} />
        <div className="px-4 pt-3">
          <div className="grid grid-cols-2 gap-1.5">
            {(['hot', 'new'] as const).map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => onChange({ kind: 'discList', which: w })}
                className="rounded-md px-1 py-1.5 text-[12.5px] cursor-pointer"
                style={{
                  background: w === state.which ? 'rgba(179,38,30,0.75)' : 'rgba(0,0,0,0.25)',
                  border: `1px solid ${w === state.which ? 'rgba(242,198,106,0.8)' : 'rgba(226,184,90,0.25)'}`,
                  color: '#f6e7c4',
                }}
              >
                {w === 'hot' ? '熱門議題' : '最新議題'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          <QuestionRows list={list} onPick={openQ} empty="還沒有討論，歡迎發起第一則！" />
          <button type="button" onClick={() => onAction({ kind: 'module', module: 'create_discussion' })} className="kx-btn-primary w-full px-4 py-2.5 text-[14px] flex items-center justify-center gap-2 cursor-pointer">
            <PenLine className="w-4 h-4" /> 發起討論（新分頁）
          </button>
        </div>
      </>
    );
  } else if (state?.kind === 'character') {
    const c = CHARACTERS[state.id];
    body = (
      <>
        <Header title={c.name} badge={c.role} sub={c.where} onClose={close} />
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(226,184,90,0.25)' }}>
            <img src={c.img} alt={c.name} className="w-full h-48 object-contain" loading="lazy" />
          </div>
          <p className="text-[15px] leading-relaxed" style={{ color: '#f6e7c4' }}>{c.line}</p>
          <button
            type="button"
            onClick={() => onAction({ kind: 'module', module: 'agents' })}
            className="kx-btn-primary w-full px-4 py-3 text-[15px] flex items-center justify-center gap-2 cursor-pointer"
          >
            查看角色介紹 <ArrowRight className="w-5 h-5" />
          </button>
          <p className="kx-sub text-[12px]">角色介紹會開在新分頁，3D 這一頁會留在原地。</p>
        </div>
      </>
    );
  } else if (state?.kind === 'feature') {
    const f = FEATURE_INFO[state.id];
    body = (
      <>
        <Header title={f.title} badge={f.badge} sub={f.sub} onClose={close} />
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          <ActionList actions={actions} />
          <p className="kx-sub text-[13px] leading-relaxed">{f.desc}</p>
        </div>
      </>
    );
  } else if (state?.kind === 'desk') {
    body = (
      <>
        <Header title="佈告桌" badge="創點樓・中庭" sub="在佈告桌寫下你的痛點，張貼到懸賞牆" onClose={close} />
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <p className="kx-sub text-[13.5px] leading-relaxed">
            寫下你遇到的麻煩、希望怎樣解決，也可以設定懸賞。刊登後會依分類貼到對應的地方：日常疑難貼在中庭佈告欄與一樓迴廊、專業問題貼在二樓迴廊、學術探討貼在三樓迴廊。
          </p>
          <button
            type="button"
            onClick={() => onAction({ kind: 'module', module: 'create_pain_point' })}
            className="kx-btn-primary w-full px-4 py-3 text-[15px] flex items-center justify-center gap-2 cursor-pointer"
          >
            <PenLine className="w-5 h-5" /> 開新分頁填寫痛點
          </button>
          <p className="kx-sub text-[12px]">填寫頁會開在新分頁，3D 這一頁會留在原地。</p>
          <div className="kx-divider" />
          <p className="kx-sub text-[12.5px]">先看看各樓層已經有哪些痛點：</p>
          <div className="grid grid-cols-2 gap-1.5">
            {PAIN_FLOORS.map((f, i) => (
              <button
                key={f.label}
                type="button"
                onClick={() => onChange({ kind: 'painFloor', level: i })}
                className="rounded-md px-2 py-2 text-[12.5px] cursor-pointer text-left"
                style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(226,184,90,0.25)', color: '#f6e7c4' }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </>
    );
  } else if (state?.kind === 'question' && renderQuestionPage) {
    const back = () => onChange(state.back);
    body = (
      <>
        <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: '1px solid rgba(226,184,90,0.3)' }}>
          {state.back && (
            <button type="button" onClick={back} className="kx-btn-ghost px-3 py-1.5 text-[13px] flex items-center gap-1 cursor-pointer">
              <ChevronLeft className="w-4 h-4" /> 回到列表
            </button>
          )}
          <span className="kx-sub text-[12.5px] truncate flex-1">{badgeOf(state.question)}</span>
          <button type="button" onClick={close} className="kx-round w-8 h-8 shrink-0" title="關閉 (Esc)" aria-label="關閉">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain bg-white text-stone-900 font-sans">
          {renderQuestionPage(state.question, state.back ? back : close)}
        </div>
      </>
    );
  } else if (state?.kind === 'question') {
    const q = state.question;
    const img = q.cardDisplayImage || q.coverImage;
    body = (
      <>
        <Header title={badgeOf(q)} onClose={close} onBack={state.back ? () => onChange(state.back) : undefined} />
        <div className="flex-1 overflow-y-auto">
          {img && (
            <div className="relative w-full aspect-video overflow-hidden" style={{ background: '#140c07' }}>
              <img src={img} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover blur-md opacity-50 scale-110" />
              <img src={img} alt={q.title} className="relative w-full h-full object-contain" />
            </div>
          )}
          <div className="px-4 py-3 space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {[q.category, q.subcategory, q.tertiaryCategory].filter(Boolean).map((t) => (
                <span key={t as string} className="text-[11.5px] px-2 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.3)', color: '#fbe3a4', border: '1px solid rgba(226,184,90,0.3)' }}>
                  {t}
                </span>
              ))}
            </div>
            <h2 className="kx-title text-[19px] leading-snug">{q.title || '（未命名）'}</h2>
            <p className="kx-sub text-[12.5px]">
              {q.authorName || 'IdeaX 使用者'}
              {q.bounty > 0 ? `・懸賞 ${q.bounty.toLocaleString()}` : ''}
            </p>
            {q.description && (
              <p className="text-[13.5px] leading-relaxed whitespace-pre-line line-clamp-[12]" style={{ color: '#efe0bd' }}>
                {q.description}
              </p>
            )}
          </div>
        </div>
        <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(226,184,90,0.3)' }}>
          <button type="button" onClick={() => onOpenQuestion(q)} className="kx-btn-primary w-full px-4 py-2.5 text-[14px] flex items-center justify-center gap-1.5 cursor-pointer">
            在平台中開啟完整內容 <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </>
    );
  }

  return (
    <aside
      className={`kx-root absolute top-0 bottom-0 left-0 z-[45] ${state?.kind === 'question' && renderQuestionPage ? 'w-[720px] max-w-[100vw]' : 'w-[400px] max-w-[92vw]'} transition-[transform,width] duration-300 ease-out`}
      style={{ transform: body ? 'translateX(0)' : 'translateX(-105%)', pointerEvents: body ? 'auto' : 'none' }}
      aria-hidden={!body}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div className="kx-panel h-full flex flex-col" style={{ borderRadius: 0, borderLeft: 'none', borderTop: 'none', borderBottom: 'none' }}>
        {body}
      </div>
    </aside>
  );
};

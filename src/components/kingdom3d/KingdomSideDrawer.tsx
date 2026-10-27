import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { SosoState } from './useSosoJobs';
import { X, ChevronRight, ChevronLeft, ArrowRight, Compass, Store, PenLine } from 'lucide-react';
import type { Question } from '../../types';
import type { BuildingInteractable } from './types';
import { isGameQuestion } from '../../utils/gameClassification';
import { painForFloor } from './PainFloorModal';
import { PAIN_FLOORS } from './stylized/painBoard';
import { STREET_PROPS, StreetProp, StallContent } from './stylized/streets';
import { actionsForBuilding, KingdomAction, KingdomActionButton } from './buildingActions';
import { isTypingTarget } from './FirstPersonControls';
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
  | { kind: 'question'; question: Question; back: DrawerState | null };

const ALL_PROPS: StreetProp[] = Object.values(STREET_PROPS).flat();
export const findStreetProp = (id: string) => ALL_PROPS.find((p) => p.id === id) || null;

const visible = (q: Question) => q.status !== 'delisted' && !(q as any).isDelisted;
const isWork = (q: Question) => q.postType === 'vibecoding_app' || q.postType === 'innovation_proposal' || isGameQuestion(q);
const time = (q: Question) => Date.parse(q.createdAt) || 0;

export function stallItems(questions: Question[], content: StallContent): Question[] {
  const pool = questions.filter(visible);
  switch (content) {
    case 'proposal':
      return pool.filter((q) => q.postType === 'innovation_proposal').sort((a, b) => time(b) - time(a));
    case 'game':
      return pool.filter((q) => isGameQuestion(q)).sort((a, b) => time(b) - time(a));
    case 'app':
      return pool.filter((q) => q.postType === 'vibecoding_app' && !isGameQuestion(q)).sort((a, b) => time(b) - time(a));
    case 'hot':
      return pool.filter(isWork).sort((a, b) => (b.viewsCount ?? b.views ?? 0) - (a.viewsCount ?? a.views ?? 0));
    case 'new':
    default:
      return pool.filter(isWork).sort((a, b) => time(b) - time(a));
  }
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
}> = ({ state, questions, onChange, onAction, onOpenQuestion, renderQuestionPage, soso }) => {
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
          <div className="grid grid-cols-4 gap-1.5">
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
        <div className="px-4 py-3 flex justify-end" style={{ borderTop: '1px solid rgba(226,184,90,0.3)' }}>
          <button type="button" onClick={() => onAction({ kind: 'module', module: 'create_pain_point' })} className="kx-btn-primary px-4 py-2 text-[13.5px] flex items-center gap-1.5 cursor-pointer">
            <PenLine className="w-4 h-4" /> 刊登痛點
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
            <p className="kx-sub text-[13px]">每個攤位擺著平台上真實的作品與提案，點攤位就能逛。</p>
            <ActionList actions={actions} />
          </div>
        </>
      );
    } else if (p?.kind === 'stall' && p.content) {
      const list = stallItems(questions, p.content);
      body = (
        <>
          <Header
            title={p.name}
            badge="創意集"
            sub={`${p.sub || ''}・共 ${list.length} 件`}
            onClose={close}
            onBack={() => {
              const gate = STREET_PROPS[p.regionId].find((s) => s.kind === 'gate');
              onChange(gate ? { kind: 'street', propId: gate.id } : null);
            }}
          />
          <div className="flex-1 overflow-y-auto px-4 py-3">
            <QuestionRows list={list.slice(0, 40)} onPick={openQ} empty="這個攤位還沒有擺上作品。" />
          </div>
        </>
      );
    } else if (p) {
      body = (
        <>
          <Header title={p.name} badge={p.regionId === 'region-discussion' ? '討論島' : '商店街'} sub={p.sub} onClose={close} />
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <p className="kx-sub text-[13.5px] leading-relaxed flex gap-2">
              <Store className="w-4 h-4 shrink-0 mt-0.5 text-amber-300" />
              {p.note || '主島商店街的店面目前是街景，還沒有開放買賣。想逛平台內容，可以到中央廣場的「探索看板」，或去創意島的創意集市集。'}
            </p>
          </div>
        </>
      );
    }
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
  } else if (state?.kind === 'desk') {
    body = (
      <>
        <Header title="佈告桌" badge="創點樓・一樓" sub="在書桌案台上寫下你的痛點，張貼到懸賞牆" onClose={close} />
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <p className="kx-sub text-[13.5px] leading-relaxed">
            寫下你遇到的麻煩、希望怎樣解決，也可以設定懸賞。刊登後會依分類貼到對應樓層：地下一樓創新創業、一樓日常疑難、二樓專業問題、三樓學術探討。
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

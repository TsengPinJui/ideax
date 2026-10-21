import React, { useEffect, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import { CURRENCIES, type CurrencyCode } from '../../data/currency';
import type { ConditionTag } from '../JobExplorerView';

/**
 * 匯職缺的條件標籤：點一下就在標籤上直接修改（不另外展開大編輯框）。
 * - 一般條件：直接改文字
 * - 薪資：計薪方式＋金額＋幣別（幣別可下拉選，也可以直接打字，例如「美金」「JPY」）
 * - 年資：數字＋「年以上」
 * Enter 或點勾勾儲存、Esc 取消；新加的標籤沒填東西就自動移除。
 */

const CURRENCY_ALIASES: Array<[RegExp, CurrencyCode]> = [
  [/^(twd|ntd|nt\$?|台幣|臺幣|新台幣|新臺幣)$/i, 'TWD'],
  [/^(usd|us\$|\$|美金|美元)$/i, 'USD'],
  [/^(jpy|¥|日幣|日圓|日元)$/i, 'JPY'],
  [/^(cny|rmb|人民幣)$/i, 'CNY'],
  [/^(hkd|hk\$|港幣)$/i, 'HKD'],
  [/^(sgd|s\$|新幣|新加坡幣)$/i, 'SGD'],
  [/^(krw|₩|韓元|韓幣)$/i, 'KRW'],
  [/^(myr|rm|令吉|馬幣)$/i, 'MYR'],
  [/^(vnd|₫|越南盾)$/i, 'VND'],
  [/^(aud|a\$|澳幣)$/i, 'AUD'],
  [/^(nzd|nz\$|紐幣)$/i, 'NZD'],
  [/^(cad|c\$|加幣)$/i, 'CAD'],
  [/^(gbp|£|英鎊)$/i, 'GBP'],
  [/^(eur|€|歐元)$/i, 'EUR'],
];

/** 計薪方式：可下拉選，也可以直接打（例如「月」「年」「時」「日薪」） */
const PERIODS = ['月薪', '年薪', '時薪', '日薪'] as const;
export function normalizePeriodInput(raw: string): string {
  const s = raw.trim();
  if (!s) return '月薪';
  if ((PERIODS as readonly string[]).includes(s)) return s;
  if (/時|hour|hr/i.test(s)) return '時薪';
  if (/日|天|day/i.test(s)) return '日薪';
  if (/年|year|annual/i.test(s)) return '年薪';
  if (/月|month/i.test(s)) return '月薪';
  return s.slice(0, 6);
}

/** 把使用者打的幣別（代碼、中文名稱、符號）轉成幣別代碼；認不出來但像代碼的就照大寫保留 */
export function normalizeCurrencyInput(raw: string): string {
  const s = raw.trim().replace(/\s+/g, '');
  if (!s) return 'TWD';
  const byList = CURRENCIES.find((c) => c.code.toLowerCase() === s.toLowerCase() || c.name === s || c.symbol === s || `${c.code} ${c.name}` === raw.trim());
  if (byList) return byList.code;
  const alias = CURRENCY_ALIASES.find(([re]) => re.test(s));
  if (alias) return alias[1];
  const head = s.match(/^[A-Za-z]{3}/);
  return head ? head[0].toUpperCase() : s.slice(0, 8);
}

type Props = {
  tag: ConditionTag;
  colors: string;
  icon: React.ReactNode;
  /** 新加的標籤：一出現就進入編輯 */
  autoEdit?: boolean;
  onSave: (next: ConditionTag) => void;
  onDelete: () => void;
};

export const InlineConditionTag: React.FC<Props> = ({ tag, colors, icon, autoEdit, onSave, onDelete }) => {
  const [editing, setEditing] = useState(!!autoEdit);
  const [text, setText] = useState(tag.value);
  const [num, setNum] = useState<string>(String(tag.numValue || tag.experienceYears || ''));
  const [period, setPeriod] = useState<string>(tag.salaryPeriod || '月薪');
  const [cur, setCur] = useState<string>(tag.salaryCurrency || 'TWD');
  const boxRef = useRef<HTMLDivElement>(null);
  const firstRef = useRef<HTMLInputElement>(null);
  const listId = `ixj-cur-${tag.id}`;

  const reset = () => {
    setText(tag.value);
    setNum(String(tag.numValue || tag.experienceYears || ''));
    setPeriod(tag.salaryPeriod || '月薪');
    setCur(tag.salaryCurrency || 'TWD');
  };
  useEffect(() => { if (!editing) reset(); }, [tag]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (editing) window.setTimeout(() => { firstRef.current?.focus(); firstRef.current?.select(); }, 0); }, [editing]);

  const commit = () => {
    const n = Math.max(0, Math.round(Number(String(num).replace(/[,，\s]/g, '')) || 0));
    let next: ConditionTag;
    if (tag.type === 'salary') {
      const code = normalizeCurrencyInput(cur);
      const per = normalizePeriodInput(period);
      next = { ...tag, value: n > 0 ? `${per} ${n.toLocaleString('en-US')} ${code} 以上` : '薪資不拘', numValue: n, salaryCurrency: code as CurrencyCode, salaryPeriod: per as ConditionTag['salaryPeriod'] };
    } else if (tag.type === 'experience') {
      next = { ...tag, value: n > 0 ? `${n} 年以上` : '經歷不拘', numValue: n, experienceYears: n };
    } else {
      const v = text.trim();
      if (!v) { setEditing(false); if (!tag.value) onDelete(); else reset(); return; } // 清空就當作取消；新標籤沒填就移除
      next = { ...tag, value: v };
    }
    setEditing(false);
    onSave(next);
  };
  const cancel = () => { setEditing(false); if (!tag.value) onDelete(); else reset(); };

  // 點標籤外面就儲存（像一般表格那樣）
  useEffect(() => {
    if (!editing) return;
    const onDown = (e: PointerEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) commit(); };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  });

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
  };

  const field = 'h-6 rounded-md border border-black/15 bg-white/90 px-1.5 text-xs font-black text-stone-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200';

  return (
    <div
      ref={boxRef}
      className={`group inline-flex max-w-full flex-wrap items-center gap-1 pl-2 pr-1 py-1 rounded-lg border text-xs font-bold transition-all ${colors} ${editing ? 'ring-2 ring-blue-300 border-blue-300' : 'hover:border-stone-300'}`}
    >
      {icon}
      <span className="text-stone-500 font-semibold">{tag.label}</span>

      {!editing ? (
        <>
          <button type="button" onClick={() => setEditing(true)} title={`點一下修改${tag.label}`} className="font-black text-left rounded px-0.5 -mx-0.5 hover:bg-black/5 cursor-text">
            {tag.value}
          </button>
        </>
      ) : tag.type === 'salary' ? (
        <>
          <input
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            onFocus={(e) => e.currentTarget.select()}
            onKeyDown={onKey}
            list={`${listId}-p`}
            placeholder="月薪"
            aria-label="計薪方式（可下拉選或直接輸入）"
            className={`${field} w-[3.75rem]`}
          />
          <datalist id={`${listId}-p`}>
            {PERIODS.map((p) => <option key={p} value={p} />)}
          </datalist>
          <input ref={firstRef} value={num} onChange={(e) => setNum(e.target.value.replace(/[^\d,]/g, ''))} onKeyDown={onKey} inputMode="numeric" placeholder="金額" aria-label="金額" className={`${field} w-[5.5rem] font-mono`} />
          <input
            value={cur}
            onChange={(e) => setCur(e.target.value)}
            onFocus={(e) => e.currentTarget.select()}
            onKeyDown={onKey}
            list={listId}
            placeholder="幣別"
            aria-label="幣別（可下拉選或直接輸入）"
            className={`${field} w-[4.5rem] uppercase`}
          />
          <datalist id={listId}>
            {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.name} {c.symbol}</option>)}
          </datalist>
          <span className="opacity-75">以上</span>
        </>
      ) : tag.type === 'experience' ? (
        <>
          <input ref={firstRef} value={num} onChange={(e) => setNum(e.target.value.replace(/\D/g, '').slice(0, 2))} onKeyDown={onKey} inputMode="numeric" placeholder="0" aria-label="年資" className={`${field} w-10 text-center font-mono`} />
          <span className="opacity-75">年以上（0＝不拘）</span>
        </>
      ) : (
        <input
          ref={firstRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKey}
          maxLength={60}
          placeholder={tag.type === 'company' ? '公司名稱，例如：台積電' : tag.type === 'location' ? '例如：台北市大安區' : tag.type === 'role' ? '可填多個，例如：服務生、行政' : '輸入條件'}
          aria-label={tag.label}
          style={{ width: text.trim() ? `${Math.min(22, Math.max(6, [...text.trim()].length + 2))}em` : '11em' }}
          className={`${field} max-w-[60vw]`}
        />
      )}

      {editing ? (
        <button type="button" onClick={commit} title="完成" aria-label="完成" className="p-1 rounded-md bg-[#1e3a8a] text-white hover:bg-[#1e40af] cursor-pointer">
          <Check className="w-3 h-3 stroke-[3]" />
        </button>
      ) : null}
      <button
        type="button"
        onClick={editing ? cancel : onDelete}
        title={editing ? '取消' : `刪除${tag.label}`}
        aria-label={editing ? '取消' : `刪除${tag.label}`}
        className={`p-0.5 rounded-md hover:bg-rose-100 hover:text-rose-700 transition-colors text-stone-300 cursor-pointer ${editing ? '' : 'sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100'}`}
      >
        <X className="w-3 h-3 stroke-[2.5]" />
      </button>
    </div>
  );
};

export default InlineConditionTag;

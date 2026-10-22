import React, { useState } from 'react';
import { Wrench, Loader2 } from 'lucide-react';
import { getAuthHeaders } from '../services/authHeader';
import { REPAIR_CATEGORY_LABELS, type RepairCategory } from '../utils/dataRepair';

/**
 * 管理儀表板：修正舊程式錯誤寫進資料庫的不實資料
 * 先「預覽」看會改哪些資料，確認後再「執行修正」。模擬帳號與模擬內容不會被動到。
 */
type Report = {
  ok: boolean;
  applied: boolean;
  error?: string;
  totalDocs: number;
  counts: Record<string, { docs: number; fields: number }>;
  samples: Array<{ collection: string; id: string; name?: string; fixes: Array<{ field: string; from: unknown; to: unknown; category: RepairCategory }> }>;
};

const ALL = Object.keys(REPAIR_CATEGORY_LABELS) as RepairCategory[];

export const AdminDataRepairCard: React.FC = () => {
  const [selected, setSelected] = useState<RepairCategory[]>(ALL);
  const [busy, setBusy] = useState<'preview' | 'apply' | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const call = async (apply: boolean) => {
    setBusy(apply ? 'apply' : 'preview');
    setErr(null);
    try {
      const headers = await getAuthHeaders();
      const r = await fetch('/api/admin/data-repair', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ apply, categories: selected }),
      });
      const j = (await r.json().catch(() => null)) as Report | null;
      if (!r.ok || !j || j.error) throw new Error(j?.error || `HTTP ${r.status}`);
      setReport(j);
    } catch (e: any) {
      setErr(e?.message || '連線失敗');
    } finally {
      setBusy(null);
    }
  };

  const toggle = (c: RepairCategory) => setSelected((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  const canApply = report && !report.applied && report.totalDocs > 0;

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 space-y-4">
      <div className="flex items-start gap-2.5">
        <Wrench className="w-4 h-4 text-stone-500 mt-0.5 shrink-0" />
        <div>
          <h3 className="text-[15px] font-semibold text-stone-900">修正舊資料</h3>
          <p className="text-[12.5px] text-stone-500 mt-0.5">
            以前程式錯誤寫進資料庫、不是使用者自己填的資料。先預覽，確認後再執行；模擬帳號與模擬內容不會被改。
          </p>
        </div>
      </div>

      <div className="grid gap-1.5">
        {ALL.map((c) => (
          <label key={c} className="flex items-center gap-2.5 text-[13.5px] text-stone-800 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 accent-amber-600" checked={selected.includes(c)} onChange={() => { toggle(c); setReport(null); }} />
            <span className="flex-1">{REPAIR_CATEGORY_LABELS[c]}</span>
            {report && report.counts[c] && (
              <span className="text-[12.5px] text-stone-500 tabular-nums">
                {report.counts[c].docs} 筆{report.applied ? '已修正' : ''}
              </span>
            )}
          </label>
        ))}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          disabled={!!busy || !selected.length}
          onClick={() => call(false)}
          className="h-9 px-3.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-[13px] font-medium text-stone-800 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
        >
          {busy === 'preview' && <Loader2 className="w-4 h-4 animate-spin" />}
          預覽
        </button>
        <button
          type="button"
          disabled={!!busy || !canApply}
          onClick={() => {
            if (window.confirm(`確定要修正 ${report?.totalDocs || 0} 筆資料嗎？修正後無法自動還原。`)) call(true);
          }}
          className="h-9 px-3.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-[13px] font-medium disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
        >
          {busy === 'apply' && <Loader2 className="w-4 h-4 animate-spin" />}
          執行修正
        </button>
        {report && (
          <span className="text-[12.5px] text-stone-500">
            {report.applied ? `已修正 ${report.totalDocs} 筆` : report.totalDocs ? `共 ${report.totalDocs} 筆需要修正` : '沒有需要修正的資料'}
          </span>
        )}
      </div>

      {err && <p className="text-[12.5px] text-rose-600">{err}</p>}

      {report && report.samples.length > 0 && (
        <details className="rounded-lg border border-stone-200 bg-stone-50/60 px-3 py-2">
          <summary className="text-[12.5px] text-stone-600 cursor-pointer">查看前 {report.samples.length} 筆明細</summary>
          <ul className="mt-2 space-y-1.5 max-h-72 overflow-auto">
            {report.samples.map((s) => (
              <li key={`${s.collection}-${s.id}`} className="text-[12px] text-stone-600">
                <span className="text-stone-900">{s.name || s.id}</span>
                <span className="text-stone-400">（{s.collection === 'users' ? '會員' : '解答／留言'}）</span>
                ：{s.fixes.map((f) => `${f.field} ${String(f.from)} → ${String(f.to)}`).join('、')}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
};

export default AdminDataRepairCard;

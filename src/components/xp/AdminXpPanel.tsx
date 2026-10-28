import React, { useEffect, useState } from 'react';
import { getAuthHeaders } from '../../services/authHeader';
import { XP_TASKS } from '../../data/xpRules';

/** 管理員：經驗值與升級獎勵設定（留調整紀錄）、查詢會員 XP 來源與獎勵、發放優質貢獻／更正 */
export default function AdminXpPanel() {
  const [cfg, setCfg] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');
  const [uid, setUid] = useState('');
  const [user, setUser] = useState<any>(null);
  const [grant, setGrant] = useState({ kind: 'quality', xp: '500', note: '', refId: '' });

  const call = async (url: string, body?: any) => {
    const res = await fetch(url, { method: body ? 'POST' : 'GET', headers: await getAuthHeaders(), body: body ? JSON.stringify(body) : undefined });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j.success) throw new Error(j.error || `失敗（${res.status}）`);
    return j;
  };
  const load = async () => {
    try {
      const j = await call('/api/admin/xp/config');
      setCfg(j.config);
      setLogs(j.logs || []);
    } catch (e: any) {
      setMsg(e.message);
    }
  };
  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    setMsg('');
    if (!note.trim()) return setMsg('請填寫這次調整的原因');
    try {
      await call('/api/admin/xp/config', { config: cfg, note });
      setNote('');
      setMsg('已儲存設定（已留調整紀錄）');
      void load();
    } catch (e: any) {
      setMsg(e.message);
    }
  };
  const lookup = async () => {
    setMsg('');
    try {
      setUser(await call(`/api/admin/xp/user/${encodeURIComponent(uid.trim())}`));
    } catch (e: any) {
      setMsg(e.message);
    }
  };
  const doGrant = async () => {
    setMsg('');
    try {
      await call('/api/admin/xp/grant', { userId: uid.trim(), kind: grant.kind, xp: Number(grant.xp), note: grant.note, refId: grant.refId });
      setMsg('已發放／更正');
      void lookup();
    } catch (e: any) {
      setMsg(e.message);
    }
  };

  const input = 'w-full rounded-lg border border-stone-300 px-2 py-1 text-[13px]';
  if (!cfg) return <div className="p-4 text-[13px] text-stone-500">{msg || '載入中…'}</div>;
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-stone-900">等級與經驗值</h2>
        <p className="text-[13px] text-stone-500">XP 與升級門檻固定採公式（升到下一級 500＋100×(L−1)）；這裡調整各任務 XP、每日上限與等級點數獎勵。</p>
      </div>
      {msg && <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-[13px] text-amber-800">{msg}</div>}
      <section className="rounded-2xl border border-stone-200 bg-white p-4 space-y-3">
        <div className="text-[14px] font-semibold">任務 XP</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {XP_TASKS.filter((t) => t.kind !== 'admin').map((t) => (
            <label key={t.id} className="flex items-center gap-2 text-[13px]">
              <span className="flex-1">{t.title}</span>
              <input className={`${input} w-24`} type="number" min={0} value={cfg.taskXp[t.id] ?? 0} onChange={(e) => setCfg({ ...cfg, taskXp: { ...cfg.taskXp, [t.id]: Number(e.target.value) } })} />
            </label>
          ))}
        </div>
        <div className="text-[14px] font-semibold pt-2">每日上限</div>
        <div className="grid grid-cols-3 gap-2">
          {Object.keys(cfg.dailyCaps).map((k) => (
            <label key={k} className="text-[13px]">
              {k === 'question' ? '有效問題' : k === 'answer' ? '有效回答' : '被採納'}
              <input className={input} type="number" min={0} value={cfg.dailyCaps[k]} onChange={(e) => setCfg({ ...cfg, dailyCaps: { ...cfg.dailyCaps, [k]: Number(e.target.value) } })} />
            </label>
          ))}
        </div>
        <div className="text-[14px] font-semibold pt-2">等級點數獎勵（該級合計，不另加一般獎勵）</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Object.keys(cfg.levelRewards)
            .sort((a, b) => Number(a) - Number(b))
            .map((lv) => (
              <label key={lv} className="text-[13px]">
                Lv.{lv}
                <input className={input} type="number" min={0} value={cfg.levelRewards[lv]} onChange={(e) => setCfg({ ...cfg, levelRewards: { ...cfg.levelRewards, [lv]: Number(e.target.value) } })} />
              </label>
            ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-[13px]">
            其他等級每級點數
            <input className={input} type="number" min={0} value={cfg.defaultLevelReward} onChange={(e) => setCfg({ ...cfg, defaultLevelReward: Number(e.target.value) })} />
          </label>
          <label className="text-[13px]">
            最高等級
            <input className={input} type="number" min={2} value={cfg.maxLevel} onChange={(e) => setCfg({ ...cfg, maxLevel: Number(e.target.value) })} />
          </label>
        </div>
        <label className="text-[13px] block">
          新增指定等級獎勵（輸入等級後按 Enter）
          <input
            className={input}
            type="number"
            min={2}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              const lv = Math.floor(Number((e.target as HTMLInputElement).value));
              if (lv >= 2) setCfg({ ...cfg, levelRewards: { ...cfg.levelRewards, [String(lv)]: cfg.levelRewards[String(lv)] ?? 1 } });
            }}
          />
        </label>
        <input className={input} placeholder="調整原因（必填，會留在紀錄裡）" value={note} onChange={(e) => setNote(e.target.value)} />
        <button type="button" onClick={() => void save()} className="px-4 py-2 rounded-lg bg-stone-900 text-white text-[13px] font-semibold">儲存設定</button>
        {logs.length > 0 && (
          <details className="text-[12.5px] text-stone-600">
            <summary className="cursor-pointer">調整紀錄（{logs.length}）</summary>
            <ul className="mt-2 space-y-1">
              {logs.map((l, i) => (
                <li key={i}>
                  {String(l.createdAt).slice(0, 16).replace('T', ' ')}・{l.by}・{l.note || '（無說明）'}
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-4 space-y-3">
        <div className="text-[14px] font-semibold">查詢會員 XP 與獎勵</div>
        <div className="flex gap-2">
          <input className={input} placeholder="會員 ID（users 文件編號）" value={uid} onChange={(e) => setUid(e.target.value)} />
          <button type="button" onClick={() => void lookup()} className="shrink-0 px-3 py-1 rounded-lg bg-stone-900 text-white text-[13px]">查詢</button>
        </div>
        {user && (
          <div className="space-y-2 text-[12.5px]">
            <div>Lv.{user.level}・累積 {user.totalXp} XP・距下一級 {user.toNext} XP</div>
            <details open>
              <summary className="cursor-pointer font-semibold">XP 來源（{user.ledger.length}）</summary>
              <ul className="mt-1 max-h-60 overflow-y-auto space-y-0.5">
                {user.ledger.map((e: any) => (
                  <li key={e.eventId}>
                    {String(e.createdAt).slice(0, 16).replace('T', ' ')}・{e.reason}・{e.delta >= 0 ? '+' : ''}{e.delta}・{e.by}
                  </li>
                ))}
              </ul>
            </details>
            <details>
              <summary className="cursor-pointer font-semibold">升級獎勵（{user.rewards.length}）</summary>
              <ul className="mt-1 space-y-0.5">
                {user.rewards.map((r: any) => (
                  <li key={r.level}>Lv.{r.level}・{r.points} 點・{r.status}</li>
                ))}
              </ul>
            </details>
            <details>
              <summary className="cursor-pointer font-semibold">可疑紀錄（{user.flags.length}）</summary>
              <ul className="mt-1 space-y-0.5">
                {user.flags.map((f: any, i: number) => (
                  <li key={i}>{String(f.createdAt).slice(0, 16).replace('T', ' ')}・{f.kind}・{f.refId || ''}</li>
                ))}
              </ul>
            </details>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
              <select className={input} value={grant.kind} onChange={(e) => setGrant({ ...grant, kind: e.target.value })}>
                <option value="quality">優質貢獻（500–1,000）</option>
                <option value="correction">更正（可為負數）</option>
              </select>
              <input className={input} type="number" value={grant.xp} onChange={(e) => setGrant({ ...grant, xp: e.target.value })} />
              <input className={input} placeholder="關聯內容 ID（選填）" value={grant.refId} onChange={(e) => setGrant({ ...grant, refId: e.target.value })} />
              <input className={input} placeholder="原因（必填）" value={grant.note} onChange={(e) => setGrant({ ...grant, note: e.target.value })} />
            </div>
            <button type="button" onClick={() => void doGrant()} className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-[13px]">送出</button>
          </div>
        )}
      </section>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { Cpu, FlaskConical, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { getAuthHeaders } from '../services/authHeader';

/**
 * 管理後台：內建 AI 模型（GPT-6 Luna／Claude Haiku 5.5／Gemini 3.8 Flash）
 * - 選一個「使用中」的模型；三個模型各自可調推理強度、各自測試
 * - 影響匯職缺語意理解、小燈泡分流與回答、各種 AI 文字回覆
 * - 小燈泡上網搜職缺（需要網路搜尋）與身分證辨識仍使用 Gemini
 * - 使用中的 Luna／Haiku 出錯或沒有金鑰時，會自動退回 Gemini
 */
type Provider = 'openai' | 'anthropic' | 'gemini';
type Effort = 'none' | 'low' | 'medium' | 'high' | 'xhigh';
type ProviderInfo = { id: Provider; model: string; hasKey: boolean; effort: Effort; effortOptions: Effort[]; lastError: string | null; lastErrorAt: string | null };
type Info = { provider: Provider; forced: string | null; geminiAuthDisabled: boolean; providers: ProviderInfo[] };
type TestResult = { ok: boolean; provider: Provider; model: string; effort: Effort; ms: number; sample: string; output: string | null; error: string | null };

const META: Record<Provider, { name: string; price: string; envKey: string }> = {
  openai: { name: 'GPT-6 Luna', price: '輸入 $0.10／輸出 $0.50 每百萬 tokens', envKey: 'OPENAI_API_KEY' },
  anthropic: { name: 'Claude Haiku 5.5', price: '輸入 $0.10 起／輸出 $0.50 起 每百萬 tokens', envKey: 'CLAUDE_API_KEY' },
  gemini: { name: 'Gemini 3.8 Flash', price: '輸入 $0.75／輸出 $3.75 每百萬 tokens（備援）', envKey: 'GEMINI_API_KEY' },
};
const EFFORT_LABEL: Record<Effort, { name: string; desc: string }> = {
  none: { name: '關閉', desc: '最快，不推理' },
  low: { name: '低', desc: '快，基本推理' },
  medium: { name: '中（建議）', desc: '速度與準確兼顧' },
  high: { name: '高', desc: '更準，慢幾秒' },
  xhigh: { name: '很高', desc: '最準，最慢最貴' },
};

const api = async (path: string, init?: RequestInit) => {
  const headers = await getAuthHeaders();
  const r = await fetch(path, { ...init, headers: { ...headers, ...(init?.headers || {}) } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
  return j;
};

export const AdminAiProviderCard: React.FC = () => {
  const [info, setInfo] = useState<Info | null>(null);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<Provider | null>(null);
  const [tests, setTests] = useState<Partial<Record<Provider, TestResult>>>({});

  const load = async () => {
    try { setInfo(await api('/api/admin/ai-provider')); setErr(''); } catch (e: any) { setErr(e?.message || '讀取失敗'); }
  };
  useEffect(() => { void load(); }, []);

  const save = async (body: Record<string, string>) => {
    setSaving(true);
    try { await api('/api/admin/ai-provider', { method: 'POST', body: JSON.stringify(body) }); await load(); } catch (e: any) { setErr(e?.message || '儲存失敗'); }
    setSaving(false);
  };

  const runTest = async (p: Provider) => {
    setTesting(p);
    setTests((t) => ({ ...t, [p]: undefined }));
    try {
      const r: TestResult = await api('/api/admin/ai-provider/test', { method: 'POST', body: JSON.stringify({ provider: p }) });
      setTests((t) => ({ ...t, [p]: r }));
    } catch (e: any) { setErr(e?.message || '測試失敗'); }
    setTesting(null);
    void load();
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-3.5">
      <div className="flex items-start gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-stone-900 text-white flex items-center justify-center shrink-0"><Cpu className="w-5 h-5" /></div>
        <div>
          <h4 className="font-black text-sm sm:text-base text-stone-900">內建 AI 模型</h4>
          <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">
            選一個使用中的模型；三個模型都能調推理強度、各自測試。影響匯職缺語意理解、小燈泡分流與回答、各種 AI 文字回覆（上網搜職缺與身分證辨識仍用 Gemini）。使用中的模型出錯時自動退回 Gemini。
          </p>
        </div>
      </div>

      {err && <div className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{err}</div>}
      {info?.forced && <p className="text-[11px] text-amber-800">已用環境變數 AI_PROVIDER={info.forced} 固定使用中的模型，後台切換不會生效。</p>}

      {!info ? (
        <div className="text-xs text-stone-400 flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" />讀取中…</div>
      ) : (
        <div className="space-y-3">
          {info.providers.map((p) => {
            const active = info.provider === p.id;
            const meta = META[p.id];
            const test = tests[p.id];
            const keyBad = !p.hasKey || (p.id === 'gemini' && info.geminiAuthDisabled);
            return (
              <div key={p.id} className={`rounded-xl border p-3 space-y-2.5 transition-all ${active ? 'border-stone-900 ring-2 ring-stone-200 bg-stone-50/60' : 'border-stone-200 bg-white'}`}>
                {/* 標題列：選為使用中 */}
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={saving || Boolean(info.forced)}
                    onClick={() => !active && save({ provider: p.id })}
                    className="flex items-start gap-2 text-left cursor-pointer disabled:cursor-not-allowed min-w-0"
                  >
                    <span className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 ${active ? 'border-stone-900 bg-stone-900 ring-2 ring-white ring-inset' : 'border-stone-300'}`} />
                    <span className="min-w-0">
                      <span className="block text-xs sm:text-sm font-black text-stone-900">
                        {meta.name}{active && <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-stone-900 text-white align-middle">使用中</span>}
                      </span>
                      <span className="block text-[11px] text-stone-500">{p.model}・{meta.price}</span>
                    </span>
                  </button>
                  <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${keyBad ? 'bg-rose-50 text-rose-700 border-rose-200' : p.lastError ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                    {!p.hasKey ? '沒有金鑰' : p.id === 'gemini' && info.geminiAuthDisabled ? '金鑰無效' : p.lastError ? '最近有錯誤' : '已設定金鑰'}
                  </span>
                </div>

                {/* 推理強度 */}
                <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label={`${meta.name} 推理強度`}>
                  <span className="text-[11px] font-bold text-stone-600 mr-0.5">推理強度</span>
                  {p.effortOptions.map((e) => {
                    const on = p.effort === e;
                    return (
                      <button
                        key={e}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        disabled={saving}
                        onClick={() => !on && save({ effortFor: p.id, effort: e })}
                        title={EFFORT_LABEL[e].desc}
                        className={`px-2 py-1 rounded-lg border text-[11px] font-bold cursor-pointer disabled:cursor-wait transition-all ${on ? 'bg-stone-900 border-stone-900 text-white' : 'bg-white border-stone-200 text-stone-700 hover:border-stone-400'}`}
                      >
                        {EFFORT_LABEL[e].name}
                      </button>
                    );
                  })}
                </div>

                {!p.hasKey && <p className="text-[11px] text-amber-900">到 Vercel → Settings → Environment Variables 新增 {meta.envKey} 後重新部署才能使用。</p>}
                {p.lastError && <p className="text-[11px] text-rose-700 break-all">最近錯誤：{p.lastError}</p>}

                {/* 測試 */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button type="button" onClick={() => runTest(p.id)} disabled={testing !== null} className="px-2.5 py-1 rounded-lg bg-white border border-stone-300 hover:border-stone-500 disabled:opacity-60 text-stone-800 text-[11px] font-black flex items-center gap-1.5 cursor-pointer">
                    {testing === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FlaskConical className="w-3.5 h-3.5" />}
                    測試 {meta.name}
                  </button>
                  {testing === p.id && <span className="text-[11px] text-stone-500">測試中，推理強度越高等越久…</span>}
                </div>
                {test && (
                  <div className="rounded-lg border border-stone-200 bg-white p-2.5 space-y-1 text-[11px]">
                    <div className="flex items-center gap-1.5 font-black text-stone-900">
                      {test.ok ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />}
                      {test.ok ? `正常・推理強度 ${EFFORT_LABEL[test.effort]?.name || test.effort}・${(test.ms / 1000).toFixed(1)} 秒` : `失敗：${test.error || '沒有回覆'}`}
                    </div>
                    <div className="text-stone-500">測試句：「{test.sample}」</div>
                    {test.output && <pre className="whitespace-pre-wrap break-all font-mono text-[10.5px] text-stone-800 max-h-48 overflow-auto">{test.output}</pre>}
                  </div>
                )}
              </div>
            );
          })}
          <p className="text-[11px] text-stone-500">三個都連不上時，小燈泡與匯職缺會改用固定回覆或規則整理，看起來就會很制式。</p>
        </div>
      )}
    </div>
  );
};

export default AdminAiProviderCard;

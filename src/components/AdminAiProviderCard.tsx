import React, { useEffect, useState } from 'react';
import { Cpu, FlaskConical, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { getAuthHeaders } from '../services/authHeader';

/**
 * 管理後台：內建 AI 模型切換（GPT-6 Luna ／ Gemini）
 * 影響：匯職缺語意理解、小燈泡分流與回答、各種 AI 文字與結構化回覆。
 * 小燈泡上網搜職缺（需要網路搜尋）與身分證辨識仍使用 Gemini。
 * 預設 GPT-6 Luna，出錯或沒有金鑰時會自動退回 Gemini。
 */
type Effort = 'none' | 'low' | 'medium' | 'high' | 'xhigh';
type Info = { provider: 'gemini' | 'openai'; effort: Effort; effortForced: string | null; openAiModel: string; hasOpenAiKey: boolean; forced: string | null; lastOpenAiError: string | null };
type TestResult = { ok: boolean; engine: string; effort: Effort | null; ms: number; sample: string; output: string | null; openAiError: string | null };

const api = async (path: string, init?: RequestInit) => {
  const headers = await getAuthHeaders();
  const r = await fetch(path, { ...init, headers: { ...headers, ...(init?.headers || {}) } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j?.ok === false && !('engine' in j)) throw new Error(j?.error || `HTTP ${r.status}`);
  return j;
};

export const AdminAiProviderCard: React.FC = () => {
  const [info, setInfo] = useState<Info | null>(null);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [test, setTest] = useState<TestResult | null>(null);

  const load = async () => {
    try { setInfo(await api('/api/admin/ai-provider')); setErr(''); } catch (e: any) { setErr(e?.message || '讀取失敗'); }
  };
  useEffect(() => { void load(); }, []);

  const EFFORTS: Array<{ id: Effort; name: string; desc: string }> = [
    { id: 'none', name: '關閉', desc: '最快，不推理' },
    { id: 'low', name: '低', desc: '快，基本推理' },
    { id: 'medium', name: '中（建議）', desc: '速度與準確兼顧' },
    { id: 'high', name: '高', desc: '更準，慢幾秒' },
    { id: 'xhigh', name: '很高', desc: '最準，最慢最貴' },
  ];
  const chooseEffort = async (effort: Effort) => {
    if (!info || info.effort === effort) return;
    setSaving(true);
    try {
      await api('/api/admin/ai-provider', { method: 'POST', body: JSON.stringify({ effort }) });
      await load();
      setTest(null);
    } catch (e: any) { setErr(e?.message || '儲存失敗'); }
    setSaving(false);
  };

  const choose = async (provider: 'gemini' | 'openai') => {
    if (!info || info.provider === provider) return;
    setSaving(true);
    try {
      await api('/api/admin/ai-provider', { method: 'POST', body: JSON.stringify({ provider }) });
      await load();
      setTest(null);
    } catch (e: any) { setErr(e?.message || '儲存失敗'); }
    setSaving(false);
  };

  const runTest = async () => {
    setTesting(true);
    setTest(null);
    try { setTest(await api('/api/admin/ai-provider/test', { method: 'POST', body: JSON.stringify({}) })); } catch (e: any) { setErr(e?.message || '測試失敗'); }
    setTesting(false);
    void load();
  };

  const options: Array<{ id: 'gemini' | 'openai'; name: string; desc: string }> = [
    { id: 'openai', name: 'GPT-6 Luna（預設）', desc: '輸入 $0.10／輸出 $0.50 每百萬 tokens；出錯時自動退回 Gemini' },
    { id: 'gemini', name: 'Gemini 3.8 Flash', desc: '輸入 $0.75／輸出 $3.75 每百萬 tokens' },
  ];

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-3.5">
      <div className="flex items-start gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-stone-900 text-white flex items-center justify-center shrink-0"><Cpu className="w-5 h-5" /></div>
        <div>
          <h4 className="font-black text-sm sm:text-base text-stone-900">內建 AI 模型</h4>
          <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">
            影響匯職缺語意理解、小燈泡分流與回答、各種 AI 文字回覆。小燈泡上網搜職缺與身分證辨識仍使用 Gemini。
          </p>
        </div>
      </div>

      {err && <div className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{err}</div>}

      {!info ? (
        <div className="text-xs text-stone-400 flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" />讀取中…</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" role="radiogroup" aria-label="內建 AI 模型">
            {options.map((o) => {
              const active = info.provider === o.id;
              return (
                <button
                  key={o.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={saving || Boolean(info.forced)}
                  onClick={() => choose(o.id)}
                  className={`text-left p-3 rounded-xl border transition-all cursor-pointer disabled:cursor-not-allowed ${active ? 'border-stone-900 ring-2 ring-stone-200 bg-stone-50' : 'border-stone-200 hover:border-stone-400 bg-white'}`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-black text-stone-900">
                    <span className={`w-3.5 h-3.5 rounded-full border-2 ${active ? 'border-stone-900 bg-stone-900' : 'border-stone-300'}`} />
                    {o.name}
                  </div>
                  <div className="text-[11px] text-stone-500 mt-1">{o.desc}</div>
                </button>
              );
            })}
          </div>

          {info.provider === 'openai' && (
            <div className="space-y-1.5">
              <div className="text-xs font-black text-stone-800">推理等級（GPT-6 Luna）</div>
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="推理等級">
                {EFFORTS.map((e) => {
                  const active = info.effort === e.id;
                  return (
                    <button
                      key={e.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      disabled={saving || Boolean(info.effortForced)}
                      onClick={() => chooseEffort(e.id)}
                      title={e.desc}
                      className={`px-2.5 py-1.5 rounded-lg border text-left cursor-pointer disabled:cursor-not-allowed transition-all ${active ? 'bg-stone-900 border-stone-900 text-white' : 'bg-white border-stone-200 text-stone-700 hover:border-stone-400'}`}
                    >
                      <div className="text-[11px] font-black">{e.name}</div>
                      <div className={`text-[10px] ${active ? 'text-stone-300' : 'text-stone-400'}`}>{e.desc}</div>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-stone-500">等級越高越會想、轉換條件越準，但回覆越慢、推理用的 token 也算錢。逾時會自動退回 Gemini。</p>
              {info.effortForced && <p className="text-[11px] text-amber-800">已用環境變數 AI_REASONING_EFFORT={info.effortForced} 固定，後台切換不會生效。</p>}
            </div>
          )}

          {info.forced && <p className="text-[11px] text-amber-800">已用環境變數 AI_PROVIDER={info.forced} 固定，後台切換不會生效。</p>}
          {info.provider === 'openai' && !info.hasOpenAiKey && (
            <div className="text-[11px] font-bold text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>還沒設定 OpenAI 金鑰：請到 Vercel → Settings → Environment Variables 新增 OPENAI_API_KEY 後重新部署。設定前會繼續使用 Gemini。</span>
            </div>
          )}
          {info.provider === 'openai' && info.lastOpenAiError && (
            <p className="text-[11px] text-rose-700">最近一次 OpenAI 錯誤：{info.lastOpenAiError}（已自動退回 Gemini）</p>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" onClick={runTest} disabled={testing} className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:opacity-60 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer">
              {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FlaskConical className="w-3.5 h-3.5" />}
              測試目前的模型
            </button>
            <span className="text-[11px] text-stone-500">用一句口語求職需求，看它整理出的條件與花費時間</span>
          </div>

          {test && (
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 space-y-1.5 text-[11px]">
              <div className="flex items-center gap-1.5 font-black text-stone-900">
                {test.ok ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />}
                {test.ok ? `回覆來自：${test.engine}${test.effort && !test.engine.startsWith('Gemini') ? `（推理：${test.effort}）` : ''}・${(test.ms / 1000).toFixed(1)} 秒` : '兩個模型都沒有回覆'}
              </div>
              <div className="text-stone-500">測試句：「{test.sample}」</div>
              {test.openAiError && <div className="text-rose-700">OpenAI 錯誤：{test.openAiError}</div>}
              {test.output && <pre className="whitespace-pre-wrap break-all font-mono text-[10.5px] text-stone-800 max-h-56 overflow-auto">{test.output}</pre>}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminAiProviderCard;

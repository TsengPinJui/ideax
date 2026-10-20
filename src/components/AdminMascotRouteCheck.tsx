import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, Send } from 'lucide-react';
import { fetchMascotAgentCheck, testMascotRoute, type MascotAgentCheck } from '../services/mascotApi';

/** 後台：確認三位助理的金鑰接對了 Dify 應用，並可測試一句話會轉接給誰 */
export const AdminMascotRouteCheck: React.FC = () => {
  const [rows, setRows] = useState<MascotAgentCheck[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('我的帳戶怎麼了');
  const [testing, setTesting] = useState<'' | 'route' | 'ask'>('');
  const [result, setResult] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    setRows(await fetchMascotAgentCheck());
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const run = async (ask: boolean) => {
    if (!q.trim() || testing) return;
    setTesting(ask ? 'ask' : 'route');
    setResult(null);
    setResult(await testMascotRoute(q.trim(), ask));
    setTesting('');
  };

  const problem = (r: MascotAgentCheck) =>
    r.agent === 'aicrm' || r.agent === 'explorer' ? ''
    : !r.configured ? '沒有設定金鑰（目前由小燈泡用 Gemini 代答）'
    : r.sharedWith.length ? `和${r.sharedWith.join('、')}共用同一把金鑰`
    : r.nameLooksRight === false ? '應用名稱看起來不像這位助理，請確認'
    : !r.difyAppName ? '查不到 Dify 應用名稱（金鑰可能失效或 Dify 版本不支援）'
    : '';

  return (
    <div className="space-y-3 p-3 rounded-xl bg-white border border-stone-200">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-black text-stone-900">轉接檢查</p>
        <button type="button" onClick={load} disabled={loading} className="inline-flex items-center gap-1 px-2.5 min-h-[36px] rounded-lg border border-stone-200 text-xs font-bold text-stone-700 hover:border-amber-400 disabled:opacity-50">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />重新檢查
        </button>
      </div>

      {rows === null && !loading && <p className="text-xs text-rose-700 font-bold">讀取失敗，請確認以管理員身分登入。</p>}
      {rows && (
        <ul className="space-y-2">
          {rows.map((r) => {
            const p = problem(r);
            return (
              <li key={r.agent} className={`p-2.5 rounded-lg border text-xs ${p ? 'border-amber-300 bg-amber-50' : 'border-emerald-200 bg-emerald-50/60'}`}>
                <div className="flex items-center gap-1.5 font-black text-stone-900">
                  {p ? <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" aria-hidden="true" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden="true" />}
                  {r.label}
                </div>
                <div className="mt-1 text-stone-600 leading-relaxed">
                  環境變數：<code className="font-mono">{r.envName || '（未設定）'}</code>
                  {r.keyTail && <span className="text-stone-400">（…{r.keyTail}）</span>}
                  <br />Dify 應用：<span className="font-bold text-stone-800">{r.difyAppName || '—'}</span>
                </div>
                {p && <p className="mt-1 font-bold text-amber-800">{p}</p>}
                {r.agent === 'aicrm' && <p className="mt-1 text-stone-500">小燈泡不會轉接這位助理：AI-CRM 是會員功能，只能在網站介面使用（個人中心 →「AI-CRM 客戶關係管理」）。</p>}
                {r.agent === 'explorer' && <p className="mt-1 text-stone-500">小燈泡不會轉接這位助理：小燈泡不提供工作建議，僅提供前往「全網搜職」的捷徑按鈕，由「探險家」在「全網搜職」頁面為用戶服務。</p>}
              </li>
            );
          })}
        </ul>
      )}

      <div className="pt-1 space-y-2">
        <label className="block space-y-1">
          <span className="block text-xs font-black text-stone-900">測試一句話會轉給誰</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} maxLength={200}
            className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-base sm:text-sm text-stone-900 focus:outline-2 focus:outline-amber-400" />
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => run(false)} disabled={!!testing} className="inline-flex items-center gap-1 px-3 min-h-[40px] rounded-xl border border-stone-200 bg-stone-50 hover:border-amber-400 text-xs font-bold text-stone-800 disabled:opacity-50">
            {testing === 'route' ? '判斷中…' : '只看分流'}
          </button>
          <button type="button" onClick={() => run(true)} disabled={!!testing} className="inline-flex items-center gap-1 px-3 min-h-[40px] rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-black text-stone-950 disabled:opacity-50">
            <Send className="w-3.5 h-3.5" aria-hidden="true" />{testing === 'ask' ? '等助理回覆中…' : '實際問問看'}
          </button>
        </div>
        {result && (
          <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200 text-xs text-stone-700 leading-relaxed space-y-1" role="status">
            {result.error ? <p className="font-bold text-rose-700">{result.error}</p> : (
              <>
                <p>轉接給：<span className="font-black text-stone-900">{result.label}</span>
                  <span className="text-stone-400">（{result.routedBy === 'keyword' ? '關鍵字直接判斷' : result.routedBy === 'ai' ? 'AI 判斷' : '預設'}）</span></p>
                {result.agent !== 'none' && result.agent !== 'mascot' && <p>實際回答的 Dify 應用：<span className="font-bold text-stone-900">{result.difyAppName || '—'}</span>（{result.envName || '未設定'}）</p>}
                {'answer' in result && (
                  <p className="whitespace-pre-wrap">回答{result.latencyMs ? `（${(result.latencyMs / 1000).toFixed(1)} 秒）` : ''}：{result.answer || '（沒有回應）'}</p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

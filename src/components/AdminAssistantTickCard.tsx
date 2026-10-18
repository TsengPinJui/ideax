import React, { useState } from 'react';
import { AdminSessionNotice } from './AdminSessionNotice';
import { Bot } from 'lucide-react';
import { getAuthHeaders } from '../services/authHeader';

/** 管理員工具：手動執行一次 AI 特助伺服器值班（平常由系統每 5 分鐘自動執行） */
export const AdminAssistantTickCard: React.FC = () => {
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    setSummary(null);
    try {
      const res = await fetch('/api/admin/run-assistant-tick', { method: 'POST', headers: await getAuthHeaders(), body: '{}' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || `執行失敗（${res.status}）`);
      const r = data.result || {};
      setSummary(
        `啟用特助的專家 ${r.experts ?? 0} 位｜送出排程訊息 ${r.scheduledSent ?? 0} 則｜代回客戶 ${r.autoReplies ?? 0} 則｜巡檢 ${r.crmScans ?? 0} 位、找到 ${r.crmMatches ?? 0} 件` +
          (r.errors?.length ? `｜錯誤 ${r.errors.length} 筆` : '') +
          `（${Math.round((r.durationMs || 0) / 100) / 10} 秒）`
      );
    } catch (e: any) {
      setError(e?.message || '執行失敗');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
          <Bot className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black text-stone-900">AI 特助伺服器值班</p>
          <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">
            系統每 5 分鐘自動執行：送出到期的排程訊息、專家未回覆時代回客戶、依間隔巡檢新案件並通知專家。可在這裡手動執行一次確認運作。
          </p>
        </div>
      </div>
      <AdminSessionNotice />
      <button
        type="button"
        disabled={busy}
        onClick={run}
        className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black disabled:opacity-50 cursor-pointer"
      >
        {busy ? '執行中…' : '立即執行一次'}
      </button>
      {error && <p className="text-xs font-bold text-rose-700">⚠️ {error}</p>}
      {summary && <p className="text-xs text-stone-700 bg-white rounded-xl border border-indigo-200 p-3">{summary}</p>}
    </div>
  );
};

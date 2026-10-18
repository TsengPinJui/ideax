import React, { useState } from 'react';
import { AdminSessionNotice } from './AdminSessionNotice';
import { ShieldCheck } from 'lucide-react';
import { getAuthHeaders } from '../services/authHeader';

interface BackfillResult {
  applied: boolean;
  usersLinked: number;
  usersMissing: number;
  conversations: number;
  transactions: number;
  notifications: number;
}

/**
 * 管理員工具：替舊資料補上 Firebase 帳號對照
 * 發佈新的資料庫權限規則前執行一次，舊的私訊、交易、通知才看得到。
 */
export const AdminAuthBackfillCard: React.FC = () => {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<BackfillResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (apply: boolean) => {
    if (apply && !window.confirm('確定要正式寫入資料庫嗎？這會替舊資料補上帳號對照。')) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/backfill-auth-uids', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ apply }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || `執行失敗（${res.status}）`);
      setResult(data.result);
    } catch (e: any) {
      setError(e?.message || '執行失敗');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black text-stone-900">補齊帳號對照（資料庫權限）</p>
          <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">
            發佈新的資料庫規則前執行一次：替舊的私訊、交易紀錄與通知補上 Firebase 帳號，當事人才看得到。先按「試算」看會改多少筆，再按「正式執行」。
          </p>
        </div>
      </div>
      <AdminSessionNotice />
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          disabled={busy}
          onClick={() => run(false)}
          className="px-3.5 py-2 rounded-xl bg-white border border-emerald-300 text-emerald-800 text-xs font-black disabled:opacity-50 cursor-pointer"
        >
          {busy ? '執行中…' : '試算（不寫入）'}
        </button>
        <button
          type="button"
          disabled={busy || !result || result.applied}
          onClick={() => run(true)}
          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
        >
          正式執行
        </button>
      </div>
      {error && <p className="text-xs font-bold text-rose-700">⚠️ {error}</p>}
      {result && (
        <div className="text-xs text-stone-700 bg-white rounded-xl border border-emerald-200 p-3 space-y-1">
          <p className="font-black text-emerald-800">{result.applied ? '✅ 已完成寫入' : '試算結果（尚未寫入）'}</p>
          <p>會員補上帳號對照：{result.usersLinked} 位</p>
          <p>私訊對話：{result.conversations} 段</p>
          <p>交易紀錄：{result.transactions} 筆</p>
          <p>通知：{result.notifications} 則</p>
          <p className="text-stone-500">
            找不到 Firebase 帳號的舊會員：{result.usersMissing} 位（這些會員重新登入或註冊一次即可）
          </p>
          {result.applied && <p className="font-bold text-emerald-800 pt-1">下一步：到 Firebase 發佈新的 firestore.rules。</p>}
        </div>
      )}
    </div>
  );
};

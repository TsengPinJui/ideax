import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { AdminSessionNotice } from './AdminSessionNotice';
import { getAuthHeaders } from '../services/authHeader';

interface MigrateResult {
  scanned: number;
  toMigrate: number;
  migrated: number;
}

/**
 * 管理員工具：把舊的付費解答完整內容搬到受保護區（answer_secrets）
 * 搬移後，只有回答者、已解鎖的會員與管理員能看到完整內容。
 */
interface MigrationCardProps {
  title: string;
  description: string;
  endpoint: string;
  confirmText: string;
  itemLabel: string;
}

export const AdminAnswerSecretsCard: React.FC = () => (
  <AdminDataMigrationCard
    title="保護付費解答內容"
    description="把舊的付費解答完整內容搬到受保護區，之後只有回答者、已解鎖的會員與管理員看得到。先按「試算」看有幾筆，再按「正式執行」。"
    endpoint="/api/admin/migrate-answer-secrets"
    confirmText="確定要正式搬移嗎？付費解答的完整內容會從公開資料移到受保護區。"
    itemLabel="解答"
  />
);

export const AdminPrivateProfilesCard: React.FC = () => (
  <AdminDataMigrationCard
    title="保護會員個資"
    description="把會員的 Email、電話、銀行帳戶與問卷資料從公開資料搬到私密區，之後只有本人與管理員看得到。先按「試算」看有幾筆，再按「正式執行」。"
    endpoint="/api/admin/migrate-private-profiles"
    confirmText="確定要正式搬移嗎？會員的聯絡方式與財務資料會從公開資料移到私密區。"
    itemLabel="會員"
  />
);

const AdminDataMigrationCard: React.FC<MigrationCardProps> = ({ title, description, endpoint, confirmText, itemLabel }) => {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<(MigrateResult & { applied: boolean }) | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (apply: boolean) => {
    if (apply && !window.confirm(confirmText)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ apply }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || `執行失敗（${res.status}）`);
      setResult({ ...data.result, applied: apply });
    } catch (e: any) {
      setError(e?.message || '執行失敗');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
          <Lock className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black text-stone-900">{title}</p>
          <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">{description}</p>
        </div>
      </div>
      <AdminSessionNotice />
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          disabled={busy}
          onClick={() => run(false)}
          className="px-3.5 py-2 rounded-xl bg-white border border-amber-300 text-amber-800 text-xs font-black disabled:opacity-50 cursor-pointer"
        >
          {busy ? '執行中…' : '試算（不寫入）'}
        </button>
        <button
          type="button"
          disabled={busy || !result || result.applied || result.toMigrate === 0}
          onClick={() => run(true)}
          className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
        >
          正式執行
        </button>
      </div>
      {error && <p className="text-xs font-bold text-rose-700">⚠️ {error}</p>}
      {result && (
        <div className="text-xs text-stone-700 bg-white rounded-xl border border-amber-200 p-3 space-y-1">
          <p className="font-black text-amber-800">{result.applied ? '✅ 已完成搬移' : '試算結果（尚未寫入）'}</p>
          <p>掃描{itemLabel}：{result.scanned} 筆</p>
          <p>需要搬移：{result.toMigrate} 筆</p>
          {result.applied && <p>已搬移：{result.migrated} 筆</p>}
          {result.applied && <p className="font-bold text-amber-800 pt-1">下一步：到 Firebase 發佈新的 firestore.rules。</p>}
        </div>
      )}
    </div>
  );
};

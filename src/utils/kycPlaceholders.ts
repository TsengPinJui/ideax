/**
 * 過去核准實名認證時，系統曾在缺漏欄位自動填入下列預設值（並非用戶填寫）。
 * 後台顯示時一律當作「未填寫」，避免被誤認為真實資料。
 */
const PLACEHOLDERS = new Set(['A123456789', '0912-345-678', 'user@ideax.io']);

export function realKycValue(v?: string | null): string {
  const t = String(v ?? '').trim();
  if (!t || PLACEHOLDERS.has(t)) return '';
  return t;
}

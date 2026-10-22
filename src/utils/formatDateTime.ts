/** ISO 時間轉成台灣時間「2026/10/16 11:00」；不是合法時間就原樣回傳 */
export function formatDateTime(v?: string | number | null): string {
  if (v === undefined || v === null || v === '') return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
}

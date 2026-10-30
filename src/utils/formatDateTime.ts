/**
 * 格式化日期時間工具
 * 支援 ISO 字串、時間戳記、Date 物件或既有日期字串，統一輸出清晰易讀的台灣時間格式
 */
export function formatDateTime(input?: string | number | Date | null): string {
  if (input === null || input === undefined || input === '') {
    return '';
  }

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return '';
    // 若已是 YYYY-MM-DD 或 YYYY/MM/DD 純日期格式且無時間部分，直接正規化斜線回傳
    if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split(/[-/]/);
      return `${y}/${m.padStart(2, '0')}/${d.padStart(2, '0')}`;
    }
    // 若已是 YYYY/MM/DD HH:mm 格式
    if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}\s+\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed)) {
      return trimmed.replace(/-/g, '/');
    }
  }

  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) {
    return typeof input === 'string' ? input.trim() : '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}/${month}/${day} ${hours}:${minutes}`;
}

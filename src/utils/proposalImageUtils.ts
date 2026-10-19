/**
 * 提案封面：有上傳圖片就用上傳的；沒有的話，用提案標題產生一張文字封面。
 * （以前會隨機配一張跟內容無關的庫存照片，看起來很假，已改掉）
 */

const PALETTES: Array<[string, string, string]> = [
  ['#fff7ed', '#fed7aa', '#9a3412'],
  ['#eff6ff', '#bfdbfe', '#1e3a8a'],
  ['#f0fdf4', '#bbf7d0', '#14532d'],
  ['#faf5ff', '#e9d5ff', '#581c87'],
  ['#fdf2f8', '#fbcfe8', '#831843'],
  ['#ecfeff', '#a5f3fc', '#164e63'],
  ['#fefce8', '#fde68a', '#713f12'],
  ['#f1f5f9', '#cbd5e1', '#0f172a'],
];

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 37 + str.charCodeAt(i)) >>> 0;
  return h;
}

function escapeXml(t: string): string {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** 把標題切成最多三行（中文約每行 13 字） */
function wrapTitle(title: string): string[] {
  const clean = title.replace(/^【[^】]*】/, '').replace(/\s+/g, ' ').trim() || title.trim();
  const chars = Array.from(clean);
  const lines: string[] = [];
  let cur = '';
  let width = 0;
  for (const ch of chars) {
    const w = /[\x00-\xff]/.test(ch) ? 0.55 : 1;
    if (width + w > 13 && cur) {
      lines.push(cur);
      cur = '';
      width = 0;
      if (lines.length === 3) break;
    }
    cur += ch;
    width += w;
  }
  if (lines.length < 3 && cur) lines.push(cur);
  if (lines.length === 3 && chars.join('').length > lines.join('').length) {
    lines[2] = lines[2].slice(0, -1) + '…';
  }
  return lines;
}

/** 依標題產生的文字封面（SVG data URI） */
export function generateTitleCover(id: string, title: string): string {
  const [bg, soft, ink] = PALETTES[hash(id || title) % PALETTES.length];
  const lines = wrapTitle(title || '創新提案');
  const startY = 360 - (lines.length - 1) * 42;
  const text = lines
    .map((l, i) => `<text x="80" y="${startY + i * 84}" font-size="62" font-weight="700" fill="${ink}">${escapeXml(l)}</text>`)
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><rect width="1280" height="720" fill="${bg}"/><circle cx="1130" cy="120" r="260" fill="${soft}" opacity=".7"/><circle cx="1240" cy="640" r="160" fill="${soft}" opacity=".5"/><g font-family="'PingFang TC','Noto Sans TC','Microsoft JhengHei',sans-serif">${text}</g><rect x="80" y="${startY + lines.length * 84 - 30}" width="90" height="8" rx="4" fill="${ink}" opacity=".35"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function getUniqueProposalCoverImage(
  proposal: { id?: string; title?: string; images?: string[]; imageUrl?: string; track?: string },
  _fallbackIndex: number = 0
): string {
  if (proposal.images && proposal.images.length > 0 && proposal.images[0]) {
    return proposal.images[0];
  }
  if (proposal.imageUrl && !proposal.imageUrl.includes('photo-1508614589041-895b88991e3e')) {
    return proposal.imageUrl;
  }
  return generateTitleCover(proposal.id || '', proposal.title || '');
}

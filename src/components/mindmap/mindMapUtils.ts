import type { MindMapData, MindMapNode } from '../../types';

/** 心智圖限制：中心主題往下最多 3 層、總共 40 個節點、每個節點 40 字 */
export const MIND_MAP_MAX_DEPTH = 3;
export const MIND_MAP_MAX_NODES = 40;
export const MIND_MAP_MAX_TEXT = 40;

let seq = 0;
export const newNodeId = () => `n${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;
export const newNode = (text = ''): MindMapNode => ({ id: newNodeId(), text, children: [] });

export const countNodes = (n: MindMapNode): number => 1 + n.children.reduce((s, c) => s + countNodes(c), 0);

/** 範本：照提案類型先放好常用分支，作者再改 */
export function mindMapTemplate(kind: 'proposal' | 'vibecoding', title: string): MindMapData {
  const branches = kind === 'vibecoding'
    ? ['解決什麼問題', '主要功能', '使用的技術', '目標使用者', '下一步']
    : ['要解決的痛點', '解決方法', '目標用戶', '怎麼獲利', '下一步'];
  return { root: { id: newNodeId(), text: title.trim().slice(0, MIND_MAP_MAX_TEXT) || '我的點子', children: branches.map((b) => newNode(b)) } };
}

export function emptyMindMap(title: string): MindMapData {
  return { root: { id: newNodeId(), text: title.trim().slice(0, MIND_MAP_MAX_TEXT) || '我的點子', children: [newNode('')] } };
}

/** 存檔前整理：去掉空白節點（有子項目的空白節點保留子項目往上提）、限制層數字數與總數 */
export function sanitizeMindMap(m: MindMapData | null | undefined): MindMapData | null {
  if (!m || !m.root) return null;
  let budget = MIND_MAP_MAX_NODES;
  const clean = (n: MindMapNode, depth: number): MindMapNode[] => {
    const text = String(n.text || '').replace(/\s+/g, ' ').trim().slice(0, MIND_MAP_MAX_TEXT);
    const kids = depth < MIND_MAP_MAX_DEPTH ? (n.children || []).flatMap((c) => clean(c, depth + 1)) : [];
    if (!text) return kids; // 空白節點：子項目往上提
    if (budget <= 0) return [];
    budget--;
    return [{ id: String(n.id || newNodeId()).slice(0, 40), text, children: kids }];
  };
  budget--; // 中心主題
  const rootText = String(m.root.text || '').trim().slice(0, MIND_MAP_MAX_TEXT) || '我的點子';
  const children = (m.root.children || []).flatMap((c) => clean(c, 1));
  if (!children.length) return null; // 只有中心主題就當作沒有心智圖
  return { root: { id: String(m.root.id || newNodeId()).slice(0, 40), text: rootText, children }, updatedAt: new Date().toISOString() };
}

// ── 排版：中心主題在中間，第一層分支左右平均分配，往外長 ──
export type LaidNode = { node: MindMapNode; depth: number; branch: number; x: number; y: number; w: number; h: number; side: 1 | -1; parentId?: string };

const textWidth = (s: string, px: number) => {
  let w = 0;
  for (const ch of Array.from(s || ' ')) w += /[\u0000-ÿ]/.test(ch) ? px * 0.58 : px;
  return w;
};
export const nodeBox = (text: string, depth: number) => {
  const font = depth === 0 ? 15 : depth === 1 ? 13 : 12;
  const padX = depth === 0 ? 18 : 12;
  const w = Math.min(depth === 0 ? 220 : 180, Math.max(depth === 0 ? 90 : 48, textWidth(text, font) + padX * 2));
  const lines = Math.max(1, Math.ceil((textWidth(text, font) + padX * 2) / w));
  const h = (depth === 0 ? 40 : depth === 1 ? 32 : 28) + (lines - 1) * (font + 4);
  return { w, h, font };
};

const GAP_X = 44, GAP_Y = 10;

export function layoutMindMap(m: MindMapData): { nodes: LaidNode[]; minX: number; maxX: number; minY: number; maxY: number } {
  const out: LaidNode[] = [];
  const height = (n: MindMapNode, depth: number): number => {
    const own = nodeBox(n.text, depth).h;
    if (!n.children.length) return own;
    const kids = n.children.reduce((s, c) => s + height(c, depth + 1), 0) + GAP_Y * (n.children.length - 1);
    return Math.max(own, kids);
  };
  const place = (n: MindMapNode, depth: number, branch: number, side: 1 | -1, xEdge: number, yTop: number, parentId: string) => {
    const box = nodeBox(n.text, depth);
    const total = height(n, depth);
    const cy = yTop + total / 2;
    const x = side === 1 ? xEdge : xEdge - box.w;
    out.push({ node: n, depth, branch, x, y: cy - box.h / 2, w: box.w, h: box.h, side, parentId });
    let y = yTop + (total - (n.children.reduce((s, c) => s + height(c, depth + 1), 0) + GAP_Y * Math.max(0, n.children.length - 1))) / 2;
    const nextEdge = side === 1 ? x + box.w + GAP_X : x - GAP_X;
    for (const c of n.children) { place(c, depth + 1, branch, side, nextEdge, y, n.id); y += height(c, depth + 1) + GAP_Y; }
  };
  const rootBox = nodeBox(m.root.text, 0);
  out.push({ node: m.root, depth: 0, branch: -1, x: -rootBox.w / 2, y: -rootBox.h / 2, w: rootBox.w, h: rootBox.h, side: 1 });
  const kids = m.root.children;
  const nRight = Math.ceil(kids.length / 2);
  const sides: Array<[MindMapNode[], 1 | -1, number]> = [[kids.slice(0, nRight), 1, 0], [kids.slice(nRight), -1, nRight]];
  for (const [list, side, offset] of sides) {
    const total = list.reduce((s, c) => s + height(c, 1), 0) + GAP_Y * 2 * Math.max(0, list.length - 1);
    let y = -total / 2;
    const edge = side === 1 ? rootBox.w / 2 + GAP_X + 8 : -rootBox.w / 2 - GAP_X - 8;
    list.forEach((c, i) => { place(c, 1, offset + i, side, edge, y, m.root.id); y += height(c, 1) + GAP_Y * 2; });
  }
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const l of out) { minX = Math.min(minX, l.x); maxX = Math.max(maxX, l.x + l.w); minY = Math.min(minY, l.y); maxY = Math.max(maxY, l.y + l.h); }
  return { nodes: out, minX, maxX, minY, maxY };
}

/** 分支顏色（第一層每條分支一種顏色，子項目沿用） */
export const BRANCH_COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#a855f7', '#ef4444', '#0ea5e9', '#84cc16', '#ec4899'];

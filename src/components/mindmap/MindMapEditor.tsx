import React, { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, CornerDownRight, Network, Wand2, Eye, EyeOff } from 'lucide-react';
import type { MindMapData, MindMapNode } from '../../types';
import { MindMapView } from './MindMapView';
import {
  BRANCH_COLORS, MIND_MAP_MAX_DEPTH, MIND_MAP_MAX_NODES, MIND_MAP_MAX_TEXT, countNodes, emptyMindMap, mindMapTemplate, newNode, sanitizeMindMap,
} from './mindMapUtils';

type Props = {
  /** null＝沒有使用心智圖 */
  value: MindMapData | null;
  onChange: (next: MindMapData | null) => void;
  /** 提案標題：開始時當成中心主題 */
  title: string;
  kind: 'proposal' | 'vibecoding';
};

/**
 * 簡單的心智圖工具（選填）：用條列方式編輯，下面即時顯示畫好的心智圖
 * - 每一列一個節點：可以加子項目、加同層、刪除；在輸入框按 Enter 直接新增同層
 * - 最多 3 層、40 個節點；空白的節點存檔時會自動略過
 */
export const MindMapEditor: React.FC<Props> = ({ value, onChange, title, kind }) => {
  const [focusId, setFocusId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const inputs = useRef(new Map<string, HTMLInputElement>());

  useEffect(() => {
    if (!focusId) return;
    const el = inputs.current.get(focusId);
    if (el) { el.focus(); setFocusId(null); }
  }, [focusId, value]);

  const enabled = Boolean(value);
  const total = value ? countNodes(value.root) : 0;
  const full = total >= MIND_MAP_MAX_NODES;
  const preview = value ? sanitizeMindMap(value) : null;

  // 不可變更新：複製整棵樹後套用修改
  const mutate = (fn: (root: MindMapNode) => void) => {
    if (!value) return;
    const root: MindMapNode = JSON.parse(JSON.stringify(value.root));
    fn(root);
    onChange({ ...value, root });
  };
  const find = (root: MindMapNode, id: string, parent: MindMapNode | null = null): { node: MindMapNode; parent: MindMapNode | null } | null => {
    if (root.id === id) return { node: root, parent };
    for (const c of root.children) { const r = find(c, id, root); if (r) return r; }
    return null;
  };
  const setText = (id: string, text: string) => mutate((root) => { const r = find(root, id); if (r) r.node.text = text.slice(0, MIND_MAP_MAX_TEXT); });
  const addChild = (id: string) => {
    if (full) return;
    const n = newNode('');
    mutate((root) => { const r = find(root, id); if (r) r.node.children.push(n); });
    setFocusId(n.id);
  };
  const addSibling = (id: string) => {
    if (full) return;
    const n = newNode('');
    mutate((root) => {
      const r = find(root, id);
      if (!r || !r.parent) return;
      const i = r.parent.children.findIndex((c) => c.id === id);
      r.parent.children.splice(i + 1, 0, n);
    });
    setFocusId(n.id);
  };
  const remove = (id: string) => mutate((root) => {
    const r = find(root, id);
    if (!r || !r.parent) return;
    r.parent.children = r.parent.children.filter((c) => c.id !== id);
  });

  // 用一般函式畫每一列（不要做成元件，不然每打一個字整列重建、輸入框會失去焦點）
  const renderRow = (node: MindMapNode, depth: number, branch: number): React.ReactNode => {
    const color = BRANCH_COLORS[branch % BRANCH_COLORS.length];
    return (
      <div key={node.id}>
        <div className="flex items-center gap-1.5" style={{ paddingLeft: (depth - 1) * 18 }}>
          {depth > 1 && <CornerDownRight className="w-3.5 h-3.5 text-stone-300 shrink-0" />}
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color, opacity: depth === 1 ? 1 : 0.55 }} />
          <input
            ref={(el) => { if (el) inputs.current.set(node.id, el); else inputs.current.delete(node.id); }}
            value={node.text}
            onChange={(e) => setText(node.id, e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); addSibling(node.id); } }}
            maxLength={MIND_MAP_MAX_TEXT}
            placeholder={depth === 1 ? '分支，例如：目標用戶' : '細節'}
            aria-label={depth === 1 ? '分支' : '子項目'}
            className={`flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border bg-white outline-none focus:border-amber-400 ${depth === 1 ? 'text-xs font-bold border-stone-300' : 'text-xs border-stone-200'}`}
          />
          {depth < MIND_MAP_MAX_DEPTH && (
            <button type="button" onClick={() => addChild(node.id)} disabled={full} title="加子項目" aria-label="加子項目"
              className="p-1.5 rounded-lg text-stone-500 hover:text-amber-700 hover:bg-amber-50 disabled:opacity-40 cursor-pointer shrink-0">
              <CornerDownRight className="w-3.5 h-3.5" />
            </button>
          )}
          <button type="button" onClick={() => addSibling(node.id)} disabled={full} title="加同層" aria-label="加同層"
            className="p-1.5 rounded-lg text-stone-500 hover:text-amber-700 hover:bg-amber-50 disabled:opacity-40 cursor-pointer shrink-0">
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={() => remove(node.id)} title="刪除" aria-label="刪除"
            className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer shrink-0">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
        {node.children.length > 0 && (
          <div className="mt-1.5 space-y-1.5">
            {node.children.map((c) => renderRow(c, depth + 1, branch))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-3.5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          <Network className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-black text-stone-900">心智圖（選填）</p>
            <p className="text-[11px] text-stone-500 leading-snug">把點子拆成幾個重點，讀者一眼就看懂。會顯示在提案頁。</p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="使用心智圖"
          onClick={() => onChange(enabled ? null : emptyMindMap(title))}
          className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${enabled ? 'bg-amber-500' : 'bg-stone-300'}`}
        >
          <span className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>

      {value && (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" onClick={() => { const t = mindMapTemplate(kind, value.root.text || title); onChange(t); }}
              className="px-2.5 py-1 rounded-lg border border-amber-300 bg-white hover:bg-amber-50 text-[11px] font-bold text-amber-800 flex items-center gap-1 cursor-pointer">
              <Wand2 className="w-3.5 h-3.5" />用範本開始
            </button>
            <span className={`text-[11px] ${full ? 'text-amber-700 font-bold' : 'text-stone-500'}`}>{total} / {MIND_MAP_MAX_NODES} 個節點・最多 {MIND_MAP_MAX_DEPTH} 層</span>
          </div>

          {/* 中心主題 */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-black text-stone-700 shrink-0">中心主題</span>
            <input
              value={value.root.text}
              onChange={(e) => onChange({ ...value, root: { ...value.root, text: e.target.value.slice(0, MIND_MAP_MAX_TEXT) } })}
              maxLength={MIND_MAP_MAX_TEXT}
              placeholder={title || '你的點子'}
              aria-label="中心主題"
              className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-amber-300 bg-white text-xs font-black outline-none focus:border-amber-500"
            />
          </div>

          {/* 分支 */}
          <div className="space-y-1.5">
            {value.root.children.map((c, i) => renderRow(c, 1, i))}
          </div>
          <button type="button" onClick={() => addChild(value.root.id)} disabled={full}
            className="w-full py-1.5 rounded-lg border border-dashed border-amber-300 text-[11px] font-bold text-amber-800 hover:bg-amber-50 disabled:opacity-40 flex items-center justify-center gap-1 cursor-pointer">
            <Plus className="w-3.5 h-3.5" />新增分支
          </button>
          <p className="text-[10px] text-stone-400">在輸入框按 Enter 可以直接新增同一層；空白的項目會自動略過。</p>

          {/* 即時預覽 */}
          <div className="space-y-1.5">
            <button type="button" onClick={() => setShowPreview((v) => !v)} className="text-[11px] font-bold text-stone-600 hover:text-stone-900 flex items-center gap-1 cursor-pointer">
              {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}{showPreview ? '收起預覽' : '顯示預覽'}
            </button>
            {showPreview && (preview ? <MindMapView data={preview} maxHeight={360} /> : <p className="text-[11px] text-stone-400">至少填一個分支，就會在這裡畫出心智圖。</p>)}
          </div>
        </>
      )}
    </div>
  );
};

export default MindMapEditor;

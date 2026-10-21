import React from 'react';
import { Network } from 'lucide-react';
import type { MindMapData } from '../../types';
import { MindMapView } from './MindMapView';

/** 詳情頁的心智圖區塊：作者有做心智圖才顯示 */
export const MindMapSection: React.FC<{ data?: MindMapData | null; className?: string }> = ({ data, className = '' }) => {
  if (!data?.root || !Array.isArray(data.root.children) || data.root.children.length === 0) return null;
  return (
    <section className={`p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 space-y-2.5 ${className}`}>
      <h3 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
        <Network className="w-4 h-4 text-amber-600" />
        <span>心智圖</span>
      </h3>
      <MindMapView data={data} maxHeight={560} />
    </section>
  );
};

export default MindMapSection;

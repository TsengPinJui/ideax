import { useSyncExternalStore } from 'react';

/** 右下角小燈泡目前是否「展開顯示」（收合、關閉、未載入時為 false），讓其他浮動按鈕避開 */
let expanded = false;
const listeners = new Set<() => void>();

export function setMascotExpanded(v: boolean) {
  if (expanded === v) return;
  expanded = v;
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const useMascotExpanded = () => useSyncExternalStore(subscribe, () => expanded, () => false);

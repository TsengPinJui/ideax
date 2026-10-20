import React, { ComponentType, Suspense, lazy } from 'react';

/** 載入中顯示的輕量提示（避免整頁空白） */
const LazyFallback: React.FC = () => (
  <div className="w-full flex items-center justify-center py-16" role="status" aria-live="polite">
    <div className="flex items-center gap-2.5 text-sm font-bold text-stone-500">
      <span className="w-4 h-4 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
      <span>載入中…</span>
    </div>
  </div>
);

/**
 * 需要時才載入的元件（程式碼分割）。
 * 用法：const ChatView = lazyNamed(() => import('./components/ChatView'), 'ChatView');
 * 回傳的元件自帶 Suspense，使用方式與原本完全相同。
 */
export function lazyNamed<T extends ComponentType<any>>(
  loader: () => Promise<Record<string, any>>,
  exportName: string,
  options: { fallback?: React.ReactNode } = {}
): T & { preload: () => Promise<unknown> } {
  let promise: Promise<Record<string, any>> | null = null;
  const loadWithRetry = async (retries = 3): Promise<Record<string, any>> => {
    try {
      return await loader();
    } catch (err) {
      promise = null;
      if (retries > 0) {
        await new Promise((r) => setTimeout(r, 700));
        return loadWithRetry(retries - 1);
      }
      throw err;
    }
  };
  const load = () => {
    if (!promise) promise = loadWithRetry();
    return promise;
  };
  const LazyComponent = lazy(() =>
    load()
      .then((mod) => ({ default: mod[exportName] as T }))
      .catch(() => ({ default: (() => null) as unknown as T }))
  );

  const Wrapped = ((props: any) => (
    <Suspense fallback={options.fallback === undefined ? <LazyFallback /> : options.fallback}>
      <LazyComponent {...props} />
    </Suspense>
  )) as unknown as T & { preload: () => Promise<unknown> };

  Wrapped.preload = load;
  return Wrapped;
}

/** 瀏覽器閒置時預先下載常用頁面，讓之後切換更快 */
export function preloadWhenIdle(preloaders: Array<() => Promise<unknown>>, delayMs = 4000) {
  if (typeof window === 'undefined') return;
  const run = () => preloaders.forEach((p) => p().catch(() => {}));
  const idle = (window as any).requestIdleCallback as ((cb: () => void) => void) | undefined;
  setTimeout(() => (idle ? idle(run) : run()), delayMs);
}

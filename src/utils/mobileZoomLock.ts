import { useState, useEffect, useCallback } from 'react';

export type MobileZoomMode = 'locked' | 'pinch';

const STORAGE_KEY = 'ideax_mobile_zoom_mode_v1';
const CHANGE_EVENT = 'ideax_mobile_zoom_mode_change';

export function getMobileZoomMode(): MobileZoomMode {
  if (typeof window === 'undefined') return 'locked';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'pinch' || saved === 'locked') {
      return saved;
    }
  } catch {
    // ignore storage errors
  }
  return 'locked';
}

export function applyMobileZoomModeToDocument(mode: MobileZoomMode): void {
  if (typeof document === 'undefined') return;
  try {
    document.documentElement.dataset.mobileZoom = mode;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'viewport';
      document.head.appendChild(meta);
    }
    if (mode === 'pinch') {
      meta.setAttribute(
        'content',
        'width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover'
      );
    } else {
      meta.setAttribute(
        'content',
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
      );
    }
  } catch {
    // ignore DOM errors
  }
}

export function setMobileZoomMode(mode: MobileZoomMode): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // ignore
  }
  applyMobileZoomModeToDocument(mode);
  window.dispatchEvent(new CustomEvent<MobileZoomMode>(CHANGE_EVENT, { detail: mode }));
}

export function toggleMobileZoomMode(): MobileZoomMode {
  const next: MobileZoomMode = getMobileZoomMode() === 'locked' ? 'pinch' : 'locked';
  setMobileZoomMode(next);
  return next;
}

export function useMobileZoomMode(): [MobileZoomMode, (mode: MobileZoomMode) => void, () => void] {
  const [mode, setModeState] = useState<MobileZoomMode>(() => getMobileZoomMode());

  useEffect(() => {
    applyMobileZoomModeToDocument(mode);
  }, [mode]);

  useEffect(() => {
    const onModeChange = (e: Event) => {
      const custom = e as CustomEvent<MobileZoomMode>;
      if (custom.detail === 'locked' || custom.detail === 'pinch') {
        setModeState(custom.detail);
      } else {
        setModeState(getMobileZoomMode());
      }
    };
    window.addEventListener(CHANGE_EVENT, onModeChange);
    return () => window.removeEventListener(CHANGE_EVENT, onModeChange);
  }, []);

  const updateMode = useCallback((next: MobileZoomMode) => {
    setMobileZoomMode(next);
  }, []);

  const toggleMode = useCallback(() => {
    toggleMobileZoomMode();
  }, []);

  return [mode, updateMode, toggleMode];
}

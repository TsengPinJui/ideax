/**
 * Safe LocalStorage utility with QuotaExceededError protection and automatic quota recovery.
 */

export function stripHeavyFields(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(stripHeavyFields);
  }
  const copy: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string') {
      // If a string is a massive base64 data URI (> 10KB), remove or omit from localStorage to save space
      if (v.startsWith('data:image/') || v.startsWith('data:application/')) {
        if (v.length > 5120) {
          copy[k] = '';
          continue;
        }
      }
      // Truncate massive scraped raw HTML or excessively long payloads in cache (> 30KB)
      if (v.length > 30000) {
        copy[k] = v.slice(0, 30000);
        continue;
      }
    } else if (typeof v === 'object' && v !== null) {
      copy[k] = stripHeavyFields(v);
      continue;
    }
    copy[k] = v;
  }
  return copy;
}

export function pruneStorageQuota(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (!k) continue;
      // Remove legacy version keys, debug caches, or temporary entries
      if (
        k.startsWith('ideax_mvp_v1_') ||
        k.startsWith('ideax_mvp_v2_') ||
        k.includes('_cache') ||
        k.includes('_temp') ||
        k.includes('debug_')
      ) {
        keysToRemove.push(k);
      }
    }
    for (const k of keysToRemove) {
      try {
        window.localStorage.removeItem(k);
      } catch {}
    }

    // Check if large question cache exists and compact it
    const questionsKey = 'ideax_mvp_v3_questions';
    const rawQuestions = window.localStorage.getItem(questionsKey);
    if (rawQuestions && rawQuestions.length > 800000) {
      try {
        const parsed = JSON.parse(rawQuestions);
        const stripped = stripHeavyFields(parsed);
        const compacted = JSON.stringify(stripped);
        if (compacted.length < rawQuestions.length) {
          window.localStorage.setItem(questionsKey, compacted);
        }
      } catch {
        window.localStorage.removeItem(questionsKey);
      }
    }
  } catch (err) {
    console.warn('[safeStorage] Error during pruneStorageQuota:', err);
  }
}

export function safeSetItem(key: string, value: string): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (err: any) {
    const isQuota =
      err?.name === 'QuotaExceededError' ||
      err?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err?.code === 22 ||
      err?.code === 1014;

    if (isQuota) {
      console.warn(`[safeStorage] QuotaExceededError writing "${key}". Attempting cleanup...`);
      pruneStorageQuota();
      // Try again after pruning legacy keys
      try {
        window.localStorage.setItem(key, value);
        return true;
      } catch {
        // If still failing, strip heavy base64 and large media fields
        try {
          const parsed = JSON.parse(value);
          const lightened = stripHeavyFields(parsed);
          const lightValue = JSON.stringify(lightened);
          window.localStorage.setItem(key, lightValue);
          return true;
        } catch {
          // If still exceeding, remove old copy so broken state is not left
          try {
            window.localStorage.removeItem(key);
          } catch {}
          console.warn(`[safeStorage] Could not store "${key}" due to browser quota limits. App will continue in-memory.`);
          return false;
        }
      }
    }
    console.warn(`[safeStorage] Failed to set "${key}":`, err?.message || err);
    return false;
  }
}

export function safeSetJSON<T>(key: string, data: T): boolean {
  try {
    const serialized = JSON.stringify(data);
    return safeSetItem(key, serialized);
  } catch (err) {
    console.warn(`[safeStorage] Failed to serialize for "${key}":`, err);
    return false;
  }
}

export function safeGetItem(key: string): string | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    return window.localStorage.getItem(key);
  } catch (err) {
    console.warn(`[safeStorage] Failed to get "${key}":`, err);
    return null;
  }
}

export function safeGetJSON<T>(key: string, fallback: T): T {
  const raw = safeGetItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function safeRemoveItem(key: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(key);
  } catch (err) {
    console.warn(`[safeStorage] Failed to remove "${key}":`, err);
  }
}

/**
 * Monkey-patches window.localStorage.setItem globally to intercept QuotaExceededError
 * and automatically prune legacy items or strip heavy payloads without crashing React.
 */
export function installStorageQuotaGuard(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    pruneStorageQuota();

    if ((window.localStorage as any).__quotaGuarded) return;

    const storageProto = Object.getPrototypeOf(window.localStorage) || Storage.prototype;
    const originalSetItem = storageProto.setItem || window.localStorage.setItem;

    window.localStorage.setItem = function (key: string, value: string) {
      try {
        originalSetItem.call(window.localStorage, key, value);
      } catch (err: any) {
        const isQuota =
          err?.name === 'QuotaExceededError' ||
          err?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
          err?.code === 22 ||
          err?.code === 1014;

        if (isQuota) {
          console.warn(`[safeStorage] QuotaExceededError writing "${key}". Intercepted and recovering...`);
          pruneStorageQuota();
          try {
            originalSetItem.call(window.localStorage, key, value);
            return;
          } catch {
            try {
              const parsed = JSON.parse(value);
              const light = stripHeavyFields(parsed);
              originalSetItem.call(window.localStorage, key, JSON.stringify(light));
              return;
            } catch {
              console.warn(`[safeStorage] Storage quota exhausted for "${key}". Skipping write to prevent app crash.`);
              return;
            }
          }
        }
        console.warn(`[safeStorage] Error in setItem for "${key}":`, err?.message || err);
      }
    };
    (window.localStorage as any).__quotaGuarded = true;
  } catch (initErr) {
    console.warn('[safeStorage] Failed to install storage guard:', initErr);
  }
}

/**
 * Auto-save helper — interval 30s + beforeunload.
 * Consumes: setInterval, navigator.onLine (not needed), localStorage
 * Produces: autoSave(key, get) that persists draft every 30s and on page unload.
 */

export function autoSave(key: string, get: () => string): () => void {
  const save = (): void => {
    try {
      const v = get();
      // localStorage may be unavailable in some Electron contexts — guard
      if (typeof localStorage !== 'undefined' && localStorage.setItem) {
        localStorage.setItem(key, v);
      } else if (typeof window !== 'undefined' && (window as unknown as { localStorage?: Storage }).localStorage) {
        (window as unknown as { localStorage: Storage }).localStorage.setItem(key, v);
      }
    } catch {
      // quota exceeded or storage unavailable — ignore
    }
  };

  // immediate save is not required per spec; interval handles periodic saves.
  // Use window.setInterval to ensure correct type in DOM (number) vs Node.
  const intervalId: number | ReturnType<typeof setInterval> =
    typeof window !== 'undefined' && typeof window.setInterval === 'function'
      ? window.setInterval(save, 30000)
      : setInterval(save, 30000);

  const onBeforeUnload = (): void => {
    save();
  };

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('beforeunload', onBeforeUnload);
  }

  // return cleanup so callers (React useEffect) can remove listeners
  return () => {
    try {
      if (typeof window !== 'undefined' && typeof window.clearInterval === 'function') {
        window.clearInterval(intervalId as number);
      } else {
        clearInterval(intervalId as ReturnType<typeof setInterval>);
      }
    } catch {
      // ignore
    }
    try {
      if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
        window.removeEventListener('beforeunload', onBeforeUnload);
      }
    } catch {
      // ignore
    }
  };
}

/**
 * Restore helper — reads saved value for key, returns null if absent.
 */
export function restoreDraft(key: string): string | null {
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem) {
      return localStorage.getItem(key);
    }
    if (typeof window !== 'undefined' && (window as unknown as { localStorage?: Storage }).localStorage) {
      return (window as unknown as { localStorage: Storage }).localStorage.getItem(key);
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Convenience: auto-save with restore. Returns initial value and cleanup.
 * Useful for React components that want to hydrate from storage.
 */
export function setupAutoSave(key: string, get: () => string, onRestore?: (v: string) => void): () => void {
  const saved = restoreDraft(key);
  if (saved !== null && onRestore) {
    try {
      onRestore(saved);
    } catch {
      // ignore
    }
  }
  return autoSave(key, get);
}

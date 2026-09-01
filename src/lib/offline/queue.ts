/**
 * Offline queue for NIM scoring requests.
 * Persists to localStorage key `offlineQueue` when available,
 * falls back to in-memory array in non-DOM environments (vitest node).
 *
 * Consumes: navigator.onLine, localStorage, setInterval (via retry use)
 * Produces: queueScoring / pushQueue / popQueue / retryQueue
 */

export type QueueItem = {
  id: string;
  msgs: unknown[];
  at: string;
};

const QUEUE_KEY = 'offlineQueue';

// In-memory fallback for Node / vitest without DOM.
// Kept in module scope so multiple calls share state, but also syncs with localStorage when present.
let memoryQueue: QueueItem[] = [];

function getStorage(): { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void; removeItem: (k: string) => void } | null {
  try {
    // Access via globalThis to avoid ReferenceError in Node
    const g = globalThis as unknown as { localStorage?: { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void; removeItem: (k: string) => void }; window?: { localStorage?: { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void; removeItem: (k: string) => void } } };
    if (g.localStorage) return g.localStorage;
    if (g.window?.localStorage) return g.window.localStorage;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const maybeWindow = (globalThis as unknown as { window?: { localStorage?: { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void; removeItem: (k: string) => void } } }).window;
    if (maybeWindow?.localStorage) return maybeWindow.localStorage;
  } catch {
    // ignore
  }
  return null;
}

function readQueue(): QueueItem[] {
  const ls = getStorage();
  if (ls) {
    try {
      const raw = ls.getItem(QUEUE_KEY);
      if (!raw) return [...memoryQueue];
      const parsed = JSON.parse(raw) as QueueItem[];
      if (Array.isArray(parsed)) {
        memoryQueue = [...parsed];
        return [...parsed];
      }
      return [...memoryQueue];
    } catch {
      return [...memoryQueue];
    }
  }
  return [...memoryQueue];
}

function writeQueue(q: QueueItem[]): void {
  memoryQueue = [...q];
  const ls = getStorage();
  if (ls) {
    try {
      if (q.length === 0) ls.removeItem(QUEUE_KEY);
      else ls.setItem(QUEUE_KEY, JSON.stringify(q));
    } catch {
      // quota or unavailable — keep memory copy
    }
  }
}

/**
 * Push a scoring request into offline queue.
 * Persists to localStorage so it survives reloads.
 */
export function pushQueue(id: string, msgs: unknown[]): void {
  const q = readQueue();
  q.push({ id, msgs, at: new Date().toISOString() });
  writeQueue(q);
}

/**
 * Read current queue (does not mutate). Named `popQueue` for compat with spec,
 * but behaves as peek-all. Use `clearQueue` or `retryQueue` to dequeue.
 */
export function popQueue(): QueueItem[] {
  return readQueue();
}

/**
 * Alias for pushQueue — matches spec "queueScoring" producer.
 * Queues a NIM chat payload for later retry when online.
 */
export function queueScoring(attemptId: string, msgs: unknown[]): void {
  pushQueue(attemptId, msgs);
}

/**
 * Clear entire queue (utility for tests and after successful retry).
 */
export function clearQueue(): void {
  writeQueue([]);
}

/**
 * Retry queued items when online.
 * Iterates copy of queue; on success removes that item, on failure keeps it.
 * Silently no-ops when navigator.onLine === false or when no NIM is available.
 */
export async function retryQueue(): Promise<void> {
  try {
    const nav = (globalThis as unknown as { navigator?: { onLine?: boolean } }).navigator;
    const onLine = nav ? nav.onLine !== false : true;
    if (!onLine) return;
  } catch {
    // if navigator access throws, assume online and try
  }

  const q = readQueue();
  if (q.length === 0) return;

  const remaining: QueueItem[] = [];

  for (const item of q) {
    try {
      const w = globalThis as unknown as { window?: unknown } & { nim?: { chat: (m: unknown[]) => Promise<string> } };
      // prefer window.nim else global nim
      const nimChat =
        (w as unknown as { nim?: { chat: (m: unknown[]) => Promise<string> } }).nim?.chat ??
        (w as unknown as { window?: { nim?: { chat: (m: unknown[]) => Promise<string> } } }).window?.nim?.chat ??
        (globalThis as unknown as { window?: { nim?: { chat: (m: unknown[]) => Promise<string> } } }).window?.nim?.chat;

      // In renderer, window.nim is the usual. Fallback to globalThis.nim
      let chatFn = nimChat;
      try {
        const maybeWin = (globalThis as unknown as { window?: { nim?: { chat: (m: unknown[]) => Promise<string> } } }).window;
        if (!chatFn && maybeWin?.nim?.chat) chatFn = maybeWin.nim.chat;
        // fallback check via typeof window
        if (!chatFn) {
          try {
            const winCheck = typeof (globalThis as unknown as { window?: unknown }).window !== 'undefined' ? (globalThis as unknown as { window?: { nim?: { chat: (m: unknown[]) => Promise<string> } } }).window?.nim?.chat : undefined;
            if (winCheck) chatFn = winCheck;
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore
      }

      if (!chatFn) {
        // No NIM available — keep item for later
        remaining.push(item);
        continue;
      }

      await chatFn(item.msgs);
      // success — do not re-queue
    } catch {
      // keep failed item for next retry
      remaining.push(item);
    }
  }

  writeQueue(remaining);
}

/**
 * Helper: get queue length without parsing elsewhere.
 */
export function queueLength(): number {
  return readQueue().length;
}

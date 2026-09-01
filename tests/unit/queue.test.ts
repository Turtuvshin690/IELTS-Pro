import { describe, it, expect, beforeEach } from 'vitest';
import { pushQueue, popQueue, clearQueue } from '../../src/lib/offline/queue';

describe('queue', () => {
  beforeEach(() => {
    try {
      localStorage.clear();
    } catch {
      // ignore when localStorage not available (node env)
    }
    try {
      clearQueue();
    } catch {
      // ignore
    }
  });

  it('pushes and pops', () => {
    pushQueue('a1', []);
    expect(popQueue().length).toBe(1);
  });

  it('pushes multiple and preserves order', () => {
    pushQueue('a1', [{ role: 'user', content: 'hello' }]);
    pushQueue('a2', [{ role: 'user', content: 'world' }]);
    const q = popQueue();
    expect(q.length).toBe(2);
    expect(q[0].id).toBe('a1');
    expect(q[1].id).toBe('a2');
  });
});

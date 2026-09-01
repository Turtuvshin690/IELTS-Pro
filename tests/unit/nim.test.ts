import { describe, it, expect } from 'vitest';
import { buildChatPayload } from '../../src/lib/nim/nemotron';

describe('nemotron payload', () => {
  it('sets model and sampling', () => {
    const p = buildChatPayload([{ role: 'user', content: 'hello' }]);
    expect(p.model).toBe('nvidia/nemotron-3.5-lightning-30b-a3b');
    expect(p.temperature).toBe(1.0);
    expect(p.top_p).toBe(0.95);
  });
});

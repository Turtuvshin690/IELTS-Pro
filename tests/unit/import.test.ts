import { describe, it, expect } from 'vitest';
import { validateImport } from '../../src/lib/import/validator';

describe('validator', () => {
  it('rejects missing answer', () => {
    const r = validateImport({ tests: [{ id: 't1', sections: [{ questions: [{ qType: 'MCQ', prompt: 'Q', options: ['A', 'B'] }] }] }] });
    expect(r.ok).toBe(false);
  });
});

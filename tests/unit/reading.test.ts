import { describe, it, expect } from 'vitest';
import { scoreReading } from '../../src/renderer/modules/reading/scoring';

describe('reading scoring', () => {
  it('scores TFNG exact', () => expect(scoreReading([{ answer: 'True', user: 'TRUE' }])).toBe(1));
  it('trims and lowercases', () => expect(scoreReading([{ answer: ' True ', user: 'true' }])).toBe(1));
  it('counts multiple with marks', () => {
    const items = [
      { answer: 'True', user: 'true' },
      { answer: 'False', user: 'true' },
      { answer: 'Not Given', user: ' NOT GIVEN ' },
    ];
    expect(scoreReading(items)).toBe(2);
  });
  it('handles empty user', () => expect(scoreReading([{ answer: 'Yes', user: '' }])).toBe(0));
});

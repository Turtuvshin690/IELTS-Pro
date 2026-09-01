import { describe, it, expect } from 'vitest';
import { weakAreas } from '../../src/renderer/shared/progress/analytics';

describe('dashboard', () => {
  it('finds weak area', () =>
    expect(
      weakAreas([
        { qType: 'TFNG', correct: false },
        { qType: 'TFNG', correct: false },
        { qType: 'MCQ', correct: true },
      ])[0].qType,
    ).toBe('TFNG'));
});

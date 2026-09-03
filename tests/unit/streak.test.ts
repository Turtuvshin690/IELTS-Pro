import { describe, it, expect } from 'vitest';
import { dayKey, computeStreak, computeXP, TARGET_BAND_KEY } from '../../src/renderer/shared/progress/streak';

describe('streak helpers', () => {
  it('dayKey extracts YYYY-MM-DD', () => expect(dayKey('2026-09-03T10:16:00.000Z')).toBe('2026-09-03'));
  it('counts consecutive days ending today', () => {
    expect(computeStreak(['2026-09-01', '2026-09-02', '2026-09-03'], '2026-09-03')).toBe(3);
  });
  it('allows yesterday-active streak (today not yet studied)', () => {
    expect(computeStreak(['2026-09-01', '2026-09-02'], '2026-09-03')).toBe(2);
  });
  it('breaks on a gap', () => {
    expect(computeStreak(['2026-08-30', '2026-09-02', '2026-09-03'], '2026-09-03')).toBe(2);
  });
  it('empty input is zero', () => expect(computeStreak([], '2026-09-03')).toBe(0));
  it('XP is 10 per correct answer', () => expect(computeXP(7)).toBe(70));
  it('XP never goes negative', () => {
    expect(computeXP(-5)).toBe(0);
    expect(computeXP(0)).toBe(0);
  });
  it('exposes target band key', () => expect(TARGET_BAND_KEY).toBe('ieltsPro.targetBand'));
});

import { describe, it, expect } from 'vitest';
import { rawToBand, overallBand } from '../../src/lib/band/calculator';

describe('band', () => {
  it('40Q reading 30→7.0', () => expect(rawToBand(30, 40)).toBe(7.0));
  it('averages 7+7+6+6→6.5', () => expect(overallBand([7, 7, 6, 6])).toBe(6.5));
});

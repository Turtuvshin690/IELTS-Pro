import { describe, it, expect } from 'vitest';
import { countWords, parseBandJson } from '../../src/renderer/modules/writing/scoring';

describe('writing', () => {
  it('counts words', () => expect(countWords('Hello world  \n IELTS')).toBe(3));
  it('parses band json', () => expect(parseBandJson('{"overall":6.5}').overall).toBe(6.5));
});

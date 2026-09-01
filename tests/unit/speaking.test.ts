import { describe, it, expect } from 'vitest';
import { pickMime, isTooLong } from '../../src/renderer/modules/speaking/recorder';

describe('recorder', () => {
  it('picks webm', () => expect(pickMime(['audio/webm', 'audio/wav'])).toBe('audio/webm'));
  it('flags >240s', () => expect(isTooLong(241)).toBe(true));
});

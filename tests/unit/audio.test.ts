import { describe, it, expect } from 'vitest';
import { audioCachePath } from '../../src/renderer/shared/audio/cache';

describe('audio cache', () => {
  it('builds path', () => expect(audioCachePath('t1')).toContain('t1.mp3'));
});

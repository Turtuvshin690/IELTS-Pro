import { describe, it, expect, vi } from 'vitest';

vi.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (s: string) => Buffer.from(s),
    decryptString: (b: Buffer) => b.toString()
  },
  app: {
    getPath: () => '/tmp'
  },
  ipcMain: {
    handle: vi.fn()
  }
}));

import { encryptKey, decryptKey } from '../../src/main/ipc/vault';

describe('vault', () => {
  it('roundtrips key', () => {
    const enc = encryptKey('nv_test_123');
    expect(decryptKey(enc)).toBe('nv_test_123');
  });
});

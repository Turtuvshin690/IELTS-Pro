import { describe, it, expect } from 'vitest';
import fs from 'fs';
describe('bootstrap', () => {
  it('has electron.vite.config and App.tsx', () => {
    expect(fs.existsSync('electron.vite.config.ts')).toBe(true);
    expect(fs.existsSync('src/renderer/App.tsx')).toBe(true);
  });
});

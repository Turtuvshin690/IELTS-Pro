import { describe, it, expect } from 'vitest';
import pkg from '../../package.json';
import fs from 'fs';

describe('build', () => {
  it('has builder appId', () => {
    expect((pkg as any).build.appId).toBe('com.ieltspro.app');
  });

  it('has productName IELTS Pro', () => {
    expect((pkg as any).build.productName).toBe('IELTS Pro');
  });

  it('has win target nsis and portable with icon', () => {
    const win = (pkg as any).build.win;
    expect(win.icon).toBe('build/icon.ico');
    const targets = Array.isArray(win.target) ? win.target : [win.target];
    expect(targets).toEqual(expect.arrayContaining(['nsis', 'portable']));
  });

  it('has nsis oneClick false and allowToChangeInstallationDirectory true', () => {
    expect((pkg as any).build.nsis.oneClick).toBe(false);
    expect((pkg as any).build.nsis.allowToChangeInstallationDirectory).toBe(true);
  });

  it('has publish github owner you repo ielts-pro', () => {
    const pub = (pkg as any).build.publish;
    expect(pub.provider).toBe('github');
    expect(pub.owner).toBe('you');
    expect(pub.repo).toBe('ielts-pro');
  });

  it('has icons', () => {
    expect(fs.existsSync('build/icon.png')).toBe(true);
    expect(fs.existsSync('build/icon.ico')).toBe(true);
  });

  it('has updater module', () => {
    expect(fs.existsSync('src/main/updater.ts')).toBe(true);
  });
});

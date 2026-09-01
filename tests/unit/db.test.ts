import { describe, it, expect } from 'vitest';
import { migrate } from '../../src/lib/db/client';
import Database from 'better-sqlite3';

describe('db schema', () => {
  it('creates tests, sections, questions, attempts, scores', () => {
    const db = new Database(':memory:');
    migrate(db);
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all()
      .map((r: any) => r.name);
    expect(tables).toEqual(
      expect.arrayContaining(['tests', 'sections', 'questions', 'attempts', 'scores', 'settings'])
    );
  });
});

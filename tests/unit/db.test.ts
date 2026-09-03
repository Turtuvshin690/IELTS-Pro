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

  it('seeds demo tests with 3 sections and 40 questions per reading test', async () => {
    const db = new Database(':memory:');
    migrate(db);
    const { seedIfEmpty } = await import('../../src/lib/db/seed');
    const result = seedIfEmpty(db);
    expect(result.seeded).toBe(true);

    const feverSections = db.prepare("SELECT * FROM sections WHERE testId = 'reading-ieltsfever-1'").all();
    expect(feverSections.length).toBe(3);

    const feverQs = db.prepare(
      "SELECT q.* FROM questions q JOIN sections s ON q.sectionId = s.id WHERE s.testId = 'reading-ieltsfever-1'"
    ).all();
    expect(feverQs.length).toBe(40);

    const officialQs = db.prepare(
      "SELECT q.* FROM questions q JOIN sections s ON q.sectionId = s.id WHERE s.testId = 'reading-official-40'"
    ).all();
    expect(officialQs.length).toBe(40);
  });

  it('seeds FallbackDB cleanly with 40 questions per reading test', async () => {
    const os = await import('os');
    const path = await import('path');
    const fs = await import('fs');
    const { FallbackDB } = await import('../../src/lib/db/client');
    const { seedIfEmpty } = await import('../../src/lib/db/seed');

    const tmpDir = path.join(os.tmpdir(), `ielts-test-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });

    const fdb = new FallbackDB(tmpDir);
    const result = seedIfEmpty(fdb);
    expect(result.seeded).toBe(true);

    const feverSections = fdb.prepare("SELECT * FROM sections WHERE testId = 'reading-ieltsfever-1'").all();
    expect(feverSections.length).toBe(3);

    const feverQs = fdb.prepare(
      "SELECT q.* FROM questions q JOIN sections s ON q.sectionId = s.id WHERE s.testId = 'reading-ieltsfever-1'"
    ).all();
    expect(feverQs.length).toBe(40);

    const officialQs = fdb.prepare(
      "SELECT q.* FROM questions q JOIN sections s ON q.sectionId = s.id WHERE s.testId = 'reading-official-40'"
    ).all();
    expect(officialQs.length).toBe(40);

    // cleanup
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });
});

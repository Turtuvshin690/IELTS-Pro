import Database from 'better-sqlite3';

export function importTests(db: Database.Database, payload: any, _audioDir: string): void {
  const tx = db.transaction(() => {
    for (const t of payload.tests ?? []) {
      db.prepare('INSERT OR REPLACE INTO tests (id, kind, title, durationSec, createdAt) VALUES (?,?,?,?,?)').run(
        t.id,
        t.kind ?? null,
        t.title ?? null,
        t.durationSec ?? null,
        new Date().toISOString(),
      );

      for (const s of t.sections ?? []) {
        db.prepare(
          'INSERT OR REPLACE INTO sections (id, testId, type, title, audioPath, passageId) VALUES (?,?,?,?,?,?)',
        ).run(s.id, t.id, s.type ?? null, s.title ?? null, s.audioPath ?? null, s.passageId ?? null);

        for (const q of s.questions ?? []) {
          db.prepare(
            'INSERT OR REPLACE INTO questions (id, sectionId, qType, prompt, options, answer, marks) VALUES (?,?,?,?,?,?,?)',
          ).run(
            q.id,
            s.id,
            q.qType,
            JSON.stringify(q.prompt ?? null),
            JSON.stringify(q.options ?? null),
            JSON.stringify(q.answer),
            q.marks ?? 1,
          );
        }
      }

      // optional passages bulk if provided at top-level or per-test
      if (Array.isArray(t.passages)) {
        for (const p of t.passages) {
          db.prepare('INSERT OR REPLACE INTO passages (id, title, body) VALUES (?,?,?)').run(
            p.id,
            p.title ?? null,
            p.body ?? null,
          );
        }
      }
    }

    if (Array.isArray(payload.passages)) {
      for (const p of payload.passages) {
        db.prepare('INSERT OR REPLACE INTO passages (id, title, body) VALUES (?,?,?)').run(
          p.id,
          p.title ?? null,
          p.body ?? null,
        );
      }
    }
  });

  tx();
}

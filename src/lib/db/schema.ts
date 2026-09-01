export const MIGRATIONS: string[] = [
  `
  CREATE TABLE IF NOT EXISTS tests(
    id TEXT PRIMARY KEY,
    kind TEXT,
    title TEXT,
    durationSec INTEGER,
    createdAt TEXT
  );
  CREATE TABLE IF NOT EXISTS passages(
    id TEXT PRIMARY KEY,
    title TEXT,
    body TEXT
  );
  CREATE TABLE IF NOT EXISTS sections(
    id TEXT PRIMARY KEY,
    testId TEXT REFERENCES tests(id),
    type TEXT,
    title TEXT,
    audioPath TEXT,
    passageId TEXT REFERENCES passages(id)
  );
  CREATE TABLE IF NOT EXISTS questions(
    id TEXT PRIMARY KEY,
    sectionId TEXT REFERENCES sections(id),
    qType TEXT,
    prompt TEXT,
    options TEXT,
    answer TEXT,
    marks REAL
  );
  CREATE TABLE IF NOT EXISTS attempts(
    id TEXT PRIMARY KEY,
    testId TEXT,
    mode TEXT,
    startedAt TEXT,
    submittedAt TEXT,
    rawScore REAL,
    band REAL,
    answers TEXT
  );
  CREATE TABLE IF NOT EXISTS scores(
    id TEXT PRIMARY KEY,
    attemptId TEXT REFERENCES attempts(id),
    subSkill TEXT,
    band REAL,
    feedback TEXT
  );
  CREATE TABLE IF NOT EXISTS settings(
    key TEXT PRIMARY KEY,
    value TEXT
  );
  `
];

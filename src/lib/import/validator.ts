export type ImportPayload = { tests: any[] };

export const Q_TYPES = [
  'MCQ',
  'TFNG',
  'YNNG',
  'MATCH_HEADING',
  'MATCH_FEATURE',
  'SENTENCE_COMPLETION',
  'SUMMARY_COMPLETION',
  'DIAGRAM_LABEL',
  'SHORT_ANSWER',
  'MAP_LABEL',
  'FORM_COMPLETION',
] as const;

export type QType = (typeof Q_TYPES)[number];

export function validateImport(p: any): { ok: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!p || !Array.isArray(p.tests) || p.tests.length === 0) {
    errors.push('No tests');
    return { ok: false, errors };
  }

  for (const t of p.tests) {
    if (!t.id) errors.push('Test missing id');
    const sections = t.sections || [];
    for (const s of sections) {
      const questions = s.questions || [];
      for (const q of questions) {
        if (!Q_TYPES.includes(q.qType as QType)) {
          errors.push(`Bad qType ${q.qType}`);
        }
        if (q.answer == null) {
          const qid = q.id ?? q.prompt ?? 'unknown';
          errors.push(`Q ${qid} missing answer`);
        }
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

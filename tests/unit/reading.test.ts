import { describe, it, expect } from 'vitest';
import { scoreReading } from '../../src/renderer/modules/reading/scoring';

describe('reading scoring', () => {
  it('scores TFNG exact', () => expect(scoreReading([{ answer: 'True', user: 'TRUE' }])).toBe(1));
  it('trims and lowercases', () => expect(scoreReading([{ answer: ' True ', user: 'true' }])).toBe(1));
  it('counts multiple with marks', () => {
    const items = [
      { answer: 'True', user: 'true' },
      { answer: 'False', user: 'true' },
      { answer: 'Not Given', user: ' NOT GIVEN ' },
    ];
    expect(scoreReading(items)).toBe(2);
  });
  it('handles empty user', () => expect(scoreReading([{ answer: 'Yes', user: '' }])).toBe(0));

  it('verifies reading-ieltsfever-1 has 3 sections and 40 questions with no empty sections', async () => {
    const { DEMO_TESTS } = await import('../../src/lib/db/seed');
    const sections = DEMO_TESTS.sections.filter((s) => s.testId === 'reading-ieltsfever-1');
    expect(sections.length).toBe(3);

    const s1Qs = DEMO_TESTS.questions.filter((q) => q.sectionId === 's-ifever-1');
    const s2Qs = DEMO_TESTS.questions.filter((q) => q.sectionId === 's-ifever-2');
    const s3Qs = DEMO_TESTS.questions.filter((q) => q.sectionId === 's-ifever-3');

    expect(s1Qs.length).toBe(13);
    expect(s2Qs.length).toBe(13);
    expect(s3Qs.length).toBe(14);
    expect(s1Qs.length + s2Qs.length + s3Qs.length).toBe(40);
  });

  it('verifies reading-official-40 has 3 sections and 40 questions with no empty sections', async () => {
    const { DEMO_TESTS } = await import('../../src/lib/db/seed');
    const sections = DEMO_TESTS.sections.filter((s) => s.testId === 'reading-official-40');
    expect(sections.length).toBe(3);

    const s1Qs = DEMO_TESTS.questions.filter((q) => q.sectionId === 's-off-1');
    const s2Qs = DEMO_TESTS.questions.filter((q) => q.sectionId === 's-off-2');
    const s3Qs = DEMO_TESTS.questions.filter((q) => q.sectionId === 's-off-3');

    expect(s1Qs.length).toBe(13);
    expect(s2Qs.length).toBe(13);
    expect(s3Qs.length).toBe(14);
    expect(s1Qs.length + s2Qs.length + s3Qs.length).toBe(40);
  });

  it('verifies that no reading test section has 0 questions', async () => {
    const { DEMO_TESTS } = await import('../../src/lib/db/seed');
    const readingSections = DEMO_TESTS.sections.filter((s) => s.type === 'reading');
    expect(readingSections.length).toBeGreaterThan(0);
    for (const sec of readingSections) {
      const qs = DEMO_TESTS.questions.filter((q) => q.sectionId === sec.id);
      expect(qs.length, `Section ${sec.id} in test ${sec.testId} should not be empty`).toBeGreaterThan(0);
    }
  });
});

// Curated from web — primary sources: ielts.org, British Council, Cambridge, IDP
// Last fetched: 2026-09-01 via websearch (see research notes)
export type ResourceCategory = 'general' | 'reading' | 'listening' | 'writing' | 'speaking';
export type ResourceType = 'practice-test' | 'guide' | 'video' | 'pdf' | 'course' | 'tool';

export interface StudyResource {
  id: string;
  title: string;
  provider: string;
  url: string;
  category: ResourceCategory;
  type: ResourceType;
  level?: string;
  free: boolean;
  description: string;
  tags: string[];
}

export const RESOURCES: StudyResource[] = [
  // General / official
  {
    id: 'ielts-org-sample',
    title: 'IELTS Sample Test Questions — Official Practice Papers',
    provider: 'ielts.org',
    url: 'https://ielts.org/take-a-test/preparation-resources/sample-test-questions',
    category: 'general',
    type: 'practice-test',
    free: true,
    description: 'Official free practice papers for Academic & General Training. Filter by skill and download PDFs with answer keys.',
    tags: ['official', 'pdf', 'academic', 'general'],
  },
  {
    id: 'ielts-org-academic',
    title: 'IELTS Academic Sample Tasks — Full Skill Breakdown',
    provider: 'ielts.org',
    url: 'https://ielts.org/take-a-test/preparation-resources/sample-test-questions/academic-test',
    category: 'general',
    type: 'practice-test',
    free: true,
    description: '30+ sample tasks per skill: Listening (MCQ, maps, tables), Reading (TFNG, headings, features), Writing & Speaking with transcripts & keys.',
    tags: ['academic', 'transcript', 'answer-key'],
  },
  {
    id: 'british-learnenglish',
    title: 'IELTS Preparation — LearnEnglish (British Council)',
    provider: 'British Council',
    url: 'https://learnenglish.britishcouncil.org/ielts-preparation',
    category: 'general',
    type: 'course',
    free: true,
    description: 'Free IELTS Ready Member: 6 skill-based tests + computer-delivered simulation. Premium adds 40 tests & AI mini-mock.',
    tags: ['british-council', 'free-tier', 'premium'],
  },
  {
    id: 'british-ielts-ready',
    title: 'IELTS Ready Premium — 40 Tests + Dashboard',
    provider: 'British Council',
    url: 'https://takeielts.britishcouncil.org/take-ielts/prepare',
    category: 'general',
    type: 'tool',
    free: false,
    description: 'When you book with British Council: 40 Listening/Reading tests, mini-mock with AI scores, personal progress dashboard.',
    tags: ['premium', 'ai-scoring', 'dashboard'],
  },
  {
    id: 'cambridge-prep',
    title: 'Cambridge IELTS Preparation — Official Guide',
    provider: 'Cambridge English',
    url: 'https://www.cambridgeenglish.org/exams-and-tests/ielts/preparation/',
    category: 'general',
    type: 'guide',
    free: false,
    description: 'The test makers’ guide: 8 authentic tests, mindset course, Official Cambridge Guide with DVD/app for listening & speaking videos.',
    tags: ['cambridge', 'official-guide', '8-tests'],
  },
  // Reading
  {
    id: 'idp-academic-reading',
    title: 'IELTS Academic Reading — 35+ Practice Tests (IDP)',
    provider: 'IDP IELTS',
    url: 'https://ielts.idp.com/mauritius/prepare/ielts-academic-practice-test',
    category: 'reading',
    type: 'practice-test',
    free: true,
    description: '35 free reading PDFs: Multiple Choice, TFNG, YNNG, Matching Headings/Features, Summary Completion, Diagram Labels.',
    tags: ['reading', 'pdf', '35-tests'],
  },
  {
    id: 'british-academic-reading',
    title: 'Academic Reading TFNG & Matching — Sample Tasks',
    provider: 'ielts.org / British Council',
    url: 'https://ielts.org/take-a-test/preparation-resources/sample-test-questions/academic-test',
    category: 'reading',
    type: 'pdf',
    free: true,
    description: 'Practice sets for Identifying Information (TFNG), Matching Headings/Features, Sentence Completion with answer keys.',
    tags: ['tfng', 'matching', 'answer-key'],
  },
  {
    id: 'save-exams-reading',
    title: 'British Council Academic Practice — 10 Full Reading Tests',
    provider: 'Save My Exams',
    url: 'https://www.savemyexams.com/academic/ielts/british-council/past-papers/practice-test/',
    category: 'reading',
    type: 'practice-test',
    free: true,
    description: '10 full Reading tests with answer keys — mirrors Cambridge 10-18 format, ideal for timed mocks.',
    tags: ['full-test', 'timed', '10-tests'],
  },
  // Listening
  {
    id: 'idp-listening',
    title: 'IELTS Listening Practice — 4 Recordings x 10 Qs',
    provider: 'IDP IELTS',
    url: 'https://ielts.idp.com/prepare/article-free-practice-tests',
    category: 'listening',
    type: 'practice-test',
    free: true,
    description: '30-min listening via 4 recordings: social conversation, monologue, educational discussion, academic lecture — once-only playback.',
    tags: ['listening', '40-questions', 'once-only'],
  },
  {
    id: 'ielts-listening-map',
    title: 'Listening: Plan/Map/Diagram Labelling — Sample',
    provider: 'ielts.org',
    url: 'https://ielts.org/take-a-test/preparation-resources/sample-test-questions/academic-test',
    category: 'listening',
    type: 'pdf',
    free: true,
    description: 'Map labelling tasks with audio transcript + answer key — tests spatial language.',
    tags: ['map', 'diagram', 'transcript'],
  },
  {
    id: 'ielts-listening-table',
    title: 'Listening: Table & Note Completion',
    provider: 'ielts.org',
    url: 'https://ielts.org/take-a-test/preparation-resources/sample-test-questions/academic-test',
    category: 'listening',
    type: 'pdf',
    free: true,
    description: 'Form/table/note completion with transcripts — core for Sections 1-2.',
    tags: ['table', 'note', 'completion'],
  },
  // Writing
  {
    id: 'cambridge-writing-guide',
    title: 'Official Cambridge Guide to IELTS — Writing Tasks',
    provider: 'Cambridge',
    url: 'https://www.cambridge.org/us/cambridgeenglish/catalog/cambridge-english-exams-ielts/official-cambridge-guide-ielts',
    category: 'writing',
    type: 'guide',
    free: false,
    description: 'Task 1 (150w graphs/letters) + Task 2 (250w essay) with 8 tests, model answers, band 9 samples & examiner comments.',
    tags: ['task1', 'task2', 'model-answers'],
  },
  {
    id: 'british-writing-model',
    title: 'IELTS Writing Model Answers — Band Descriptors',
    provider: 'British Council',
    url: 'https://takeielts.britishcouncil.org/take-ielts/prepare',
    category: 'writing',
    type: 'guide',
    free: true,
    description: 'Public band descriptors TR/TA, CC, LR, GRA with sample scripts at Band 5-9 — align with Nemotron scoring in this app.',
    tags: ['band-descriptors', 'tr-cc-lr-gra'],
  },
  {
    id: 'idp-writing-pdf',
    title: 'IELTS Writing Practice Tests — Academic & General',
    provider: 'IDP',
    url: 'https://ielts.org/take-a-test/preparation-resources/sample-test-questions',
    category: 'writing',
    type: 'pdf',
    free: true,
    description: 'Free Writing sample tasks: Academic Task 1 (charts/processes) & General Task 1 (letters) + Task 2 essays.',
    tags: ['academic', 'general', 'essay'],
  },
  // Speaking
  {
    id: 'speaking-official',
    title: 'IELTS Speaking — 3 Parts (11-14m) Sample Videos',
    provider: 'Cambridge / IDP',
    url: 'https://www.cambridgeenglish.org/exams-and-tests/ielts/test-format/',
    category: 'speaking',
    type: 'video',
    free: true,
    description: 'Part 1 (4-5m intro), Part 2 (cue card 1m prep + 2m talk), Part 3 (4-5m discussion) — see real examiner videos.',
    tags: ['speaking', 'cue-card', 'video'],
  },
  {
    id: 'speaking-british',
    title: 'Speaking Practice — British Council Mock Tests',
    provider: 'British Council',
    url: 'https://learnenglish.britishcouncil.org/ielts-preparation',
    category: 'speaking',
    type: 'practice-test',
    free: true,
    description: 'Speaking mocks with Part 2 cue cards + examiner follow-ups; record and compare with model answers.',
    tags: ['mock', 'cue-card', 'part3'],
  },
  {
    id: 'speaking-transcript',
    title: 'Speaking Transcripts & Assessment Criteria',
    provider: 'ielts.org',
    url: 'https://ielts.org/take-a-test/preparation-resources/sample-test-questions',
    category: 'speaking',
    type: 'guide',
    free: true,
    description: 'Understand FC, LR, GRA, P scoring — practice with transcripts, then get AI scoring via Parakeet + Nemotron in app.',
    tags: ['fc-lr-gra-p', 'transcript'],
  },
  // Courses / tools
  {
    id: 'mindset-ielts',
    title: 'Mindset for IELTS — 4-Level Course',
    provider: 'Cambridge',
    url: 'https://www.cambridgeenglish.org/exams-and-tests/ielts/preparation/',
    category: 'general',
    type: 'course',
    free: false,
    description: 'Print + online blended course covering all question types, strategies, and 8 practice tests.',
    tags: ['course', '4-level', 'blended'],
  },
  {
    id: 'official-practice-vol2',
    title: 'Official IELTS Practice Materials Volume 2 + DVD',
    provider: 'British Council / Cambridge',
    url: 'https://takeielts.britishcouncil.org/take-ielts/prepare/books',
    category: 'general',
    type: 'guide',
    free: false,
    description: 'Volume 2: extra Listening/Reading/Writing/Speaking tests + DVD with listening practice & 3 speaking tests on film.',
    tags: ['volume2', 'dvd', 'extra-tests'],
  },
];

export const CATEGORIES: { id: ResourceCategory; label: string; count: number }[] = (
  ['general', 'reading', 'listening', 'writing', 'speaking'] as ResourceCategory[]
).map(id => ({ id, label: id[0].toUpperCase() + id.slice(1), count: RESOURCES.filter(r => r.category === id).length }));

export function filterResources(category: ResourceCategory | 'all', q: string): StudyResource[] {
  const normalized = q.toLowerCase().trim();
  return RESOURCES.filter(r => {
    const catOk = category === 'all' || r.category === category || r.category === 'general';
    const qOk = !normalized || [r.title, r.description, r.provider, r.tags.join(' ')].join(' ').toLowerCase().includes(normalized);
    return catOk && qOk;
  });
}

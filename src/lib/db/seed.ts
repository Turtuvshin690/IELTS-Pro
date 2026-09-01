import type Database from 'better-sqlite3';

export const DEMO_TESTS = {
  tests: [
    { id: 'reading-a1', kind: 'reading', title: 'Reading — Academic Test 1: Climate & Architecture', durationSec: 3600 },
    { id: 'reading-a2', kind: 'reading', title: 'Reading — Academic Test 2: The Silk Road', durationSec: 3600 },
    { id: 'reading-g1', kind: 'reading', title: 'Reading — General Training Test 1: Workplace & Ads', durationSec: 3600 },
    { id: 'listening-1', kind: 'listening', title: 'Listening — Test 1: Everyday Conversation + Lecture', durationSec: 1800 },
    { id: 'listening-2', kind: 'listening', title: 'Listening — Test 2: Campus & Academic Talk', durationSec: 1800 },
    { id: 'writing-a1', kind: 'writing', title: 'Writing — Academic Task 1 & 2 (Graphs + Essay)', durationSec: 3600 },
    { id: 'writing-g1', kind: 'writing', title: 'Writing — General Training (Letter + Essay)', durationSec: 3600 },
    { id: 'speaking-1', kind: 'speaking', title: 'Speaking — Part 1-3: Hometown & Technology', durationSec: 840 },
    { id: 'speaking-2', kind: 'speaking', title: 'Speaking — Part 1-3: Work & Environment', durationSec: 840 },
  ],
  passages: [
    { id: 'p-climate', title: 'The Climate-Responsive Architect', body: 'Passage 1 — The Climate-Responsive Architect\n\nIn the late 20th century, architecture began to reckon with climate not as a backdrop but as a client. Passive design — orientation, thermal mass, cross-ventilation — moved from vernacular footnote to performance metric. Glass towers, once celebrated for transparency, became case studies in solar gain. In response, practices like Foster and Rogers revisited courtyards, brise-soleil, and dense urban fabric. Recent studies of traditional housing in the Gulf show indoor temperatures 8-12°C lower than neighbouring modern blocks, despite no mechanical cooling. The lesson is not nostalgia but transfer: a wind catcher is a pressure system, not a style.\n\nPassage 2 — The Silk Road Reconsidered\n\nThe Silk Road is often imagined as a single thread from Chang’an to Venice. In reality it was a braid. Textual and archaeological evidence reveals at least three northern corridors and two southern maritime routes operating concurrently by the 8th century. Commodities moved unevenly: silk westward, glass eastward, but ideas — paper, decimal notation, Buddhist vinaya — moved fastest. The most telling find is not silk but Samarkand paper in a 9th-century Tibetan monastery, far from any “road” on European maps.' },
    { id: 'p-silk', title: 'The Silk Road Reconsidered (Extended)', body: 'Archaeologists now describe the Silk Road as overlapping networks rather than a single highway. Oases were not rests but markets where value was renegotiated. A caravan leaving Dunhuang might exchange bolts of silk for glass ingots in Bukhara, then for lapis in Merv, each leg repriced. The paper fragment from Samarkand found in Tibet suggests literacy moved alongside bales.' },
    { id: 'p-workplace', title: 'Workplace Notices — General Training', body: 'Section 1: Notices\nA: Staff canteen — Opening hours 7am-3pm, closed weekends. Hot meals 12-2pm only.\nB: Safety drill — Tuesday 10am, Assembly point B. Do not use lifts.\nC: Library — 3-week loans, fines 20p/day. Renew online.\n\nSection 2: Recruitment\nCompany X operates a two-stage interview: screening call, then panel. Panel includes line manager + HR. Candidates receive written feedback within 5 days.' },
  ],
  sections: [
    { id: 's-ra1-1', testId: 'reading-a1', type: 'reading', title: 'Passage 1 — Climate', passageId: 'p-climate' },
    { id: 's-ra1-2', testId: 'reading-a1', type: 'reading', title: 'Passage 2 — Silk Road', passageId: 'p-silk' },
    { id: 's-ra2-1', testId: 'reading-a2', type: 'reading', title: 'Passage 1 — Silk Road', passageId: 'p-silk' },
    { id: 's-rg1-1', testId: 'reading-g1', type: 'reading', title: 'Sections 1-2 — Notices', passageId: 'p-workplace' },
    { id: 's-l1-1', testId: 'listening-1', type: 'listening', title: 'Part 1 — Everyday Conversation', passageId: null, audioPath: null },
    { id: 's-l1-2', testId: 'listening-1', type: 'listening', title: 'Part 2 — Facilities Talk', passageId: null, audioPath: null },
    { id: 's-l1-3', testId: 'listening-1', type: 'listening', title: 'Part 3 — Tutorial Discussion', passageId: null, audioPath: null },
    { id: 's-l1-4', testId: 'listening-1', type: 'listening', title: 'Part 4 — Academic Lecture', passageId: null, audioPath: null },
    { id: 's-l2-1', testId: 'listening-2', type: 'listening', title: 'Listening Test 2 — 4 Parts', passageId: null, audioPath: null },
    { id: 's-wa1', testId: 'writing-a1', type: 'writing', title: 'Academic Writing — Task 1 & 2', passageId: null },
    { id: 's-wg1', testId: 'writing-g1', type: 'writing', title: 'General Writing — Letter & Essay', passageId: null },
    { id: 's-sp1-1', testId: 'speaking-1', type: 'speaking', title: 'Part 1 — Hometown & Daily Life (4-5 min)', passageId: null },
    { id: 's-sp1-2', testId: 'speaking-1', type: 'speaking', title: 'Part 2 — Cue Card: Describe a building you admire (2 min + 1 min prep)', passageId: null },
    { id: 's-sp1-3', testId: 'speaking-1', type: 'speaking', title: 'Part 3 — Discussion: Architecture & Environment (4-5 min)', passageId: null },
    { id: 's-sp2-1', testId: 'speaking-2', type: 'speaking', title: 'Speaking Test 2 — Work & Environment', passageId: null },
  ],
  questions: [
    // Reading A1 — 6 questions (TFNG, MCQ, Matching)
    { id: 'q-ra1-1', sectionId: 's-ra1-1', qType: 'TFNG', prompt: JSON.stringify('Traditional Gulf housing is cooler than modern blocks without air-conditioning.'), options: JSON.stringify(['True', 'False', 'Not Given']), answer: JSON.stringify('True'), marks: 1 },
    { id: 'q-ra1-2', sectionId: 's-ra1-1', qType: 'TFNG', prompt: JSON.stringify('Glass towers were originally designed to reduce solar gain.'), options: JSON.stringify(['True', 'False', 'Not Given']), answer: JSON.stringify('False'), marks: 1 },
    { id: 'q-ra1-3', sectionId: 's-ra1-1', qType: 'MCQ', prompt: JSON.stringify('What does the author say about wind catchers?'), options: JSON.stringify(['They are decorative only', 'They are a pressure system, not a style', 'They were invented in the 20th century', 'They increase solar gain']), answer: JSON.stringify('They are a pressure system, not a style'), marks: 1 },
    { id: 'q-ra1-4', sectionId: 's-ra1-1', qType: 'YNNG', prompt: JSON.stringify("The writer believes modern architects should copy traditional buildings exactly."), options: JSON.stringify(['Yes', 'No', 'Not Given']), answer: JSON.stringify('No'), marks: 1 },
    { id: 'q-ra1-5', sectionId: 's-ra1-2', qType: 'MCQ', prompt: JSON.stringify('How many corridors does the text say operated concurrently by the 8th century?'), options: JSON.stringify(['One', 'Two', 'At least five', 'Three']), answer: JSON.stringify('At least five'), marks: 1 },
    { id: 'q-ra1-6', sectionId: 's-ra1-2', qType: 'TFNG', prompt: JSON.stringify('The Samarkand paper found in Tibet was on a mapped European Silk Road route.'), options: JSON.stringify(['True', 'False', 'Not Given']), answer: JSON.stringify('False'), marks: 1 },
    // Reading G1
    { id: 'q-rg1-1', sectionId: 's-rg1-1', qType: 'MCQ', prompt: JSON.stringify('When is the safety drill?'), options: JSON.stringify(['Monday 10am', 'Tuesday 10am', 'Tuesday 2pm', 'Wednesday 10am']), answer: JSON.stringify('Tuesday 10am'), marks: 1 },
    { id: 'q-rg1-2', sectionId: 's-rg1-1', qType: 'SENTENCE_COMPLETION', prompt: JSON.stringify('Library fines are _____ per day.'), options: JSON.stringify(null), answer: JSON.stringify('20p'), marks: 1 },
    // Listening 1 — 8 Qs across types
    { id: 'q-l1-1', sectionId: 's-l1-1', qType: 'FORM_COMPLETION', prompt: JSON.stringify('Form: Name: ______  Phone: ______'), options: JSON.stringify(null), answer: JSON.stringify('Sofia Patel'), marks: 1 },
    { id: 'q-l1-2', sectionId: 's-l1-1', qType: 'MCQ', prompt: JSON.stringify('What time is the meeting?'), options: JSON.stringify(['9:00', '10:00', '11:30', '2:00']), answer: JSON.stringify('10:00'), marks: 1 },
    { id: 'q-l1-3', sectionId: 's-l1-2', qType: 'MAP_LABEL', prompt: JSON.stringify('Library is at ____ on the campus map.'), options: JSON.stringify(null), answer: JSON.stringify('B'), marks: 1 },
    { id: 'q-l1-4', sectionId: 's-l1-3', qType: 'MCQ', prompt: JSON.stringify('The tutor says the deadline is:'), options: JSON.stringify(['Fixed', 'Extended to Friday', 'Cancelled', 'Next month']), answer: JSON.stringify('Extended to Friday'), marks: 1 },
    { id: 'q-l1-5', sectionId: 's-l1-4', qType: 'SENTENCE_COMPLETION', prompt: JSON.stringify('The lecture argues that urban density reduces _____.'), options: JSON.stringify(null), answer: JSON.stringify('energy use'), marks: 1 },
    // Writing — instructions as questions (not scored deterministically, graded via Nemotron)
    { id: 'q-wa1-1', sectionId: 's-wa1', qType: 'WRITING_TASK1', prompt: JSON.stringify('Task 1 (Academic): The chart shows energy use by sector in 2020 vs 2023. Describe the main trends (≥150 words, 20 min).'), options: JSON.stringify(null), answer: JSON.stringify('Describe trends, compare sectors, overview + details.'), marks: 1 },
    { id: 'q-wa1-2', sectionId: 's-wa1', qType: 'WRITING_TASK2', prompt: JSON.stringify('Task 2: Some say architecture should prioritize beauty over sustainability. Discuss both views and give your opinion (≥250 words, 40 min).'), options: JSON.stringify(null), answer: JSON.stringify('Discuss both + clear position, use examples.'), marks: 1 },
    { id: 'q-wg1-1', sectionId: 's-wg1', qType: 'WRITING_TASK1', prompt: JSON.stringify('Task 1 (General): You missed a job interview. Write a letter to the employer explaining and requesting another chance (≥150 words).'), options: JSON.stringify(null), answer: JSON.stringify('Explain, apologize, request.'), marks: 1 },
    // Speaking — prompts
    { id: 'q-sp1-1', sectionId: 's-sp1-1', qType: 'SPEAKING_PART1', prompt: JSON.stringify('Part 1: Describe your hometown. What do you like most about it?'), options: JSON.stringify(null), answer: JSON.stringify('Fluency + vocab'), marks: 1 },
    { id: 'q-sp1-2', sectionId: 's-sp1-2', qType: 'SPEAKING_PART2', prompt: JSON.stringify('Part 2 Cue: Describe a building you admire. You have 1 min to prepare, then 2 min to talk. Where it is, what it looks like, why you admire it.'), options: JSON.stringify(null), answer: JSON.stringify('2-min monologue'), marks: 1 },
    { id: 'q-sp1-3', sectionId: 's-sp1-3', qType: 'SPEAKING_PART3', prompt: JSON.stringify('Part 3: Do you think governments should fund historic building preservation? Why?'), options: JSON.stringify(null), answer: JSON.stringify('Abstract discussion'), marks: 1 },
  ],
};

export function seedIfEmpty(db: any): { seeded: boolean; counts: { tests: number; sections: number; questions: number } } {
  try {
    const existing = db.prepare('SELECT COUNT(*) as c FROM tests').get() as { c: number } | undefined;
    // fallback DB returns [] for this query; handle both
    const count = (existing as any)?.c ?? (Array.isArray(existing) ? (existing as any).length : 0);
    // better check via SELECT * query
    const rows = db.prepare('SELECT * FROM tests').all();
    if (Array.isArray(rows) && rows.length > 0) return { seeded: false, counts: { tests: rows.length, sections: 0, questions: 0 } };
    if (typeof count === 'number' && count > 0) return { seeded: false, counts: { tests: count, sections: 0, questions: 0 } };
  } catch {}
  // seed
  try {
    const insertTest = db.prepare('INSERT OR REPLACE INTO tests (id, kind, title, durationSec, createdAt) VALUES (?,?,?,?,?)');
    for (const t of DEMO_TESTS.tests) insertTest.run(t.id, t.kind, t.title, t.durationSec, new Date().toISOString());
    const insertPassage = db.prepare('INSERT OR REPLACE INTO passages (id, title, body) VALUES (?,?,?)');
    for (const p of DEMO_TESTS.passages) insertPassage.run(p.id, p.title, p.body);
    const insertSection = db.prepare('INSERT OR REPLACE INTO sections (id, testId, type, title, audioPath, passageId) VALUES (?,?,?,?,?,?)');
    for (const s of DEMO_TESTS.sections) insertSection.run(s.id, s.testId, s.type, s.title, (s as any).audioPath ?? null, (s as any).passageId ?? null);
    const insertQ = db.prepare('INSERT OR REPLACE INTO questions (id, sectionId, qType, prompt, options, answer, marks) VALUES (?,?,?,?,?,?,?)');
    for (const q of DEMO_TESTS.questions) insertQ.run(q.id, q.sectionId, q.qType, q.prompt, q.options, q.answer, q.marks);
    return { seeded: true, counts: { tests: DEMO_TESTS.tests.length, sections: DEMO_TESTS.sections.length, questions: DEMO_TESTS.questions.length } };
  } catch (e) {
    return { seeded: false, counts: { tests: 0, sections: 0, questions: 0 } };
  }
}

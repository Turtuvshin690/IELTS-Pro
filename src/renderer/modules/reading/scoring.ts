function normalize(s: string): string {
  return String(s).toLowerCase().trim().replace(/\s+/g, ' ');
}

export function isCorrectAnswer(correct: string, user: string): boolean {
  const cNorm = normalize(correct);
  const uNorm = normalize(user);
  if (!uNorm) return false;
  // slash alternatives: "two to five / 2-5" or "South African tunneling/tunnelling"
  if (cNorm.includes('/')) {
    const alts = cNorm.split('/').map(a => normalize(a));
    // also handle " or " inside
    const expanded: string[] = [];
    for (const a of alts) expanded.push(a, ...a.split(' or ').map(v => normalize(v)));
    if (expanded.includes(uNorm)) return true;
  }
  // direct match
  if (cNorm === uNorm) return true;
  // for multi-answer sets where correct is single letter like "B" and user may have "B, G" — not handled here; caller handles set
  return false;
}

// For groups like Q1+Q2 Choose TWO letters B/G in either order — pass the whole group
export function scoreReadingGroup(items: { answer: string; user: string }[], groupAnswers?: string[]): number {
  // if groupAnswers provided (e.g. ["B","G"] for two Qs), check set equality regardless of order
  if (groupAnswers && groupAnswers.length > 1 && items.length === groupAnswers.length) {
    const userSet = items.map(i => normalize(i.user)).filter(Boolean).sort();
    const correctSet = groupAnswers.map(normalize).sort();
    // each user answer must be in correct set and no duplicates missing
    if (userSet.length !== correctSet.length) return 0;
    for (let i = 0; i < userSet.length; i++) if (userSet[i] !== correctSet[i]) return 0;
    return items.length; // all or nothing for the group? IELTS gives 1 per correct letter, so we return count of matches
  }
  return items.filter(i => isCorrectAnswer(i.answer, i.user)).length;
}

export function scoreReading(items: { answer: string; user: string }[]): number {
  return items.filter(i => isCorrectAnswer(i.answer, i.user)).length;
}

export function scoreReading(items: { answer: string; user: string }[]): number {
  return items.filter((i) => String(i.answer).toLowerCase().trim() === String(i.user).toLowerCase().trim()).length;
}

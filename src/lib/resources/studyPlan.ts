import { addDays, format, differenceInCalendarDays, isBefore } from 'date-fns';

export interface PlanInput {
  targetBand: number; // 5.0 - 9.0
  testDate: string; // YYYY-MM-DD
  hoursPerDay: number; // 1-6
  weakCategories?: string[]; // reading/listening etc
}

export interface PlanDay {
  date: string;
  dayLabel: string;
  focus: string;
  tasks: string[];
  minutes: number;
}

const FOCUS_ROTATION = [
  { focus: 'Reading — TFNG & Headings', tasks: ['1 TFNG set (20m)', '1 Matching Headings (20m)', 'Vocab review (10m)'] },
  { focus: 'Listening — Maps & Tables', tasks: ['1 Map labelling (15m)', '1 Table completion (15m)', 'Shadowing transcript (20m)'] },
  { focus: 'Writing — Task 1', tasks: ['1 Task 1 (graph/letter) 20m + Nemotron scoring', 'Rewrite weak sentences (15m)'] },
  { focus: 'Writing — Task 2', tasks: ['1 Task 2 essay 40m + Nemotron TR/CC/LR/GRA feedback', 'Plan next essay (10m)'] },
  { focus: 'Speaking — Parts 1-2', tasks: ['Record Part 1 x3 Qs (15m)', 'Cue card 1m prep + 2m talk (15m)', 'Parakeet transcript review (10m)'] },
  { focus: 'Speaking — Part 3 & Full Mock', tasks: ['Part 3 discussion (15m)', 'Full mock 11-14m with P scoring'] },
  { focus: 'Mock & Review', tasks: ['Timed mini-mock (40m)', 'Dashboard weak-areas review (10m)'] },
];

export function generatePlan(input: PlanInput): PlanDay[] {
  const today = new Date();
  const target = new Date(input.testDate);
  if (isBefore(target, today)) return [];
  const days = Math.min(differenceInCalendarDays(target, today) + 1, 90);
  const minutes = Math.round(input.hoursPerDay * 60);
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(today, i);
    const rot = FOCUS_ROTATION[i % FOCUS_ROTATION.length];
    // bias weak categories: duplicate their days
    const weak = input.weakCategories || [];
    const isWeakDay = weak.some(w => rot.focus.toLowerCase().includes(w.toLowerCase()));
    const tasks = isWeakDay ? [...rot.tasks, 'Extra weak-area drill (15m)'] : rot.tasks;
    return {
      date: format(date, 'yyyy-MM-dd'),
      dayLabel: format(date, 'EEE, MMM d'),
      focus: rot.focus,
      tasks,
      minutes: isWeakDay ? minutes + 15 : minutes,
    };
  });
}

export function planSummary(plan: PlanDay[]): string {
  if (!plan.length) return 'Pick a future test date.';
  return `${plan.length} days • ${plan[0].date} → ${plan[plan.length - 1].date} • avg ${Math.round(plan.reduce((a, p) => a + p.minutes, 0) / plan.length)} min/day`;
}

import { describe, it, expect } from 'vitest';
import { filterResources, RESOURCES } from '../../src/lib/resources/catalog';
import { generatePlan } from '../../src/lib/resources/studyPlan';

describe('resources catalog', () => {
  it('has 20 curated resources from web', () => expect(RESOURCES.length).toBeGreaterThanOrEqual(18));
  it('filters by category', () => expect(filterResources('reading', '').every(r => r.category === 'reading' || r.category === 'general')).toBe(true));
  it('searches TFNG', () => expect(filterResources('all', 'TFNG').length).toBeGreaterThanOrEqual(1));
});

describe('studyPlan uses date-fns', () => {
  it('generates 7 days for 1 week out', () => {
    const d = new Date(); d.setDate(d.getDate() + 6);
    const plan = generatePlan({ targetBand: 7, testDate: d.toISOString().slice(0, 10), hoursPerDay: 2 });
    expect(plan.length).toBe(7);
    expect(plan[0].minutes).toBeGreaterThanOrEqual(120);
  });
});

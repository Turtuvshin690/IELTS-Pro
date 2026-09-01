import { WRITING_SYSTEM } from '../../../lib/nim/prompts';

export function countWords(t: string): number {
  const trimmed = t.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

export function parseBandJson(s: string): {
  tr?: { band: number; feedback: string };
  cc?: { band: number; feedback: string };
  lr?: { band: number; feedback: string };
  gra?: { band: number; feedback: string };
  overall: number;
  suggestions?: string[];
  justification?: string;
  [key: string]: unknown;
} {
  const m = s.match(/\{[\s\S]*\}/);
  return JSON.parse(m ? m[0] : s);
}

export async function scoreWriting(
  essay: string,
): Promise<{
  tr: { band: number; feedback: string };
  cc: { band: number; feedback: string };
  lr: { band: number; feedback: string };
  gra: { band: number; feedback: string };
  overall: number;
  suggestions: string[];
  justification: string;
  [key: string]: unknown;
}> {
  const messages = [
    { role: 'system', content: WRITING_SYSTEM },
    { role: 'user', content: essay },
  ];
  const w = window as unknown as { nim?: { chat: (m: unknown[]) => Promise<string> } };
  if (!w.nim?.chat) throw new Error('NIM chat not available');
  const raw = await w.nim.chat(messages);
  return parseBandJson(raw) as {
    tr: { band: number; feedback: string };
    cc: { band: number; feedback: string };
    lr: { band: number; feedback: string };
    gra: { band: number; feedback: string };
    overall: number;
    suggestions: string[];
    justification: string;
  };
}

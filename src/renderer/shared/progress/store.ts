import { create } from 'zustand';

type Attempt = { id: string; testId: string; band: number; at: string };

export const useProgressStore = create<{ attempts: Attempt[]; add: (a: Attempt) => void }>((set) => ({
  attempts: [],
  add: (a) => set((s) => ({ attempts: [...s.attempts, a] })),
}));

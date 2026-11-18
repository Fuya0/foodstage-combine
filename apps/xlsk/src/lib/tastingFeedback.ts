import type { QuaternionValue } from './modelMotion';

export const BITE_PULSE_MS = 140;
export const COMPLETE_DELAY_MS = 140;
export const COMPLETE_RETURN_MS = 500;
export interface TastingVisualFeedback {
  biteAt: number;
  completedAt: number | null;
  completionFrom: QuaternionValue;
}
export function createTastingVisualFeedback(): TastingVisualFeedback {
  return { biteAt: -Infinity, completedAt: null, completionFrom: [0, 0, 0, 1] };
}

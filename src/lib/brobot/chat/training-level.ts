import type { BroBotTrainingLevel } from './types';

export function mapProfileToBroBotTrainingLevel(input: {
  trainingLevel?: string | null;
  pgyYear?: number | null;
}): BroBotTrainingLevel | null {
  const raw = (input.trainingLevel ?? '').trim().toLowerCase();
  if (!raw) return null;

  if (
    raw.includes('premed') ||
    raw.includes('student') ||
    raw.includes('graduate')
  ) {
    return 'med_student';
  }

  if (raw.includes('resident')) {
    const year = input.pgyYear ?? 0;
    if (year === 1) return 'pgy1';
    if (year === 2) return 'pgy2';
    if (year === 3) return 'pgy3';
    if (year === 4) return 'pgy4';
    if (year >= 5) return 'pgy5';
    return 'pgy2';
  }

  if (raw.includes('fellow')) return 'pgy5';
  if (raw.includes('attending')) return 'attending';

  return null;
}

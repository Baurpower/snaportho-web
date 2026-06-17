import type {
  BroBotChatMode,
  BroBotResponseDepth,
  BroBotTrainingLevel,
} from '@/lib/brobot/chat';

const STORAGE_KEY = 'snaportho:brobot:pending-request';
const MAX_AGE_MS = 30 * 60 * 1000;

export type PendingBroBotRequest = {
  prompt: string;
  mode: BroBotChatMode;
  responseDepth: BroBotResponseDepth;
  trainingLevel: BroBotTrainingLevel;
  sourceRoute: string;
  timestamp: number;
};

const modeValues = new Set(['auto', 'or_prep', 'oite', 'clinic', 'consult', 'research', 'general']);
const depthValues = new Set(['quick', 'standard', 'deep']);
const trainingValues = new Set([
  'med_student',
  'pgy1',
  'pgy2',
  'pgy3',
  'pgy4',
  'pgy5',
  'attending',
]);

function canUseSessionStorage() {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

function isPendingBroBotRequest(value: unknown): value is PendingBroBotRequest {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<PendingBroBotRequest>;

  return (
    typeof candidate.prompt === 'string' &&
    candidate.prompt.trim().length > 0 &&
    typeof candidate.mode === 'string' &&
    modeValues.has(candidate.mode) &&
    typeof candidate.responseDepth === 'string' &&
    depthValues.has(candidate.responseDepth) &&
    typeof candidate.trainingLevel === 'string' &&
    trainingValues.has(candidate.trainingLevel) &&
    typeof candidate.sourceRoute === 'string' &&
    candidate.sourceRoute.startsWith('/') &&
    typeof candidate.timestamp === 'number'
  );
}

export function savePendingBroBotRequest(
  request: Omit<PendingBroBotRequest, 'timestamp'>
) {
  if (!canUseSessionStorage()) return;

  const pending: PendingBroBotRequest = {
    ...request,
    prompt: request.prompt.trim(),
    timestamp: Date.now(),
  };

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
  } catch {
    // Best effort only. Losing this should not block sign-in.
  }
}

export function readPendingBroBotRequest(): PendingBroBotRequest | null {
  if (!canUseSessionStorage()) return null;

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!isPendingBroBotRequest(parsed)) {
      clearPendingBroBotRequest();
      return null;
    }

    if (Date.now() - parsed.timestamp > MAX_AGE_MS) {
      clearPendingBroBotRequest();
      return null;
    }

    return parsed;
  } catch {
    clearPendingBroBotRequest();
    return null;
  }
}

export function clearPendingBroBotRequest() {
  if (!canUseSessionStorage()) return;

  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Best effort only.
  }
}

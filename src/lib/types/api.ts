/* ─── src/lib/api.ts ────────────────────────────────────────── */
import type { BroBotPayload } from '@/types/caseprep';

const BASE = process.env.NEXT_PUBLIC_CASEPREP_API;

if (!BASE) {
  throw new Error('❌ NEXT_PUBLIC_CASEPREP_API is not defined in .env');
}

console.log('[BroBot] API base:', BASE);


/**
 * @deprecated Phase 1 — Direct browser calls to CasePrep are no longer allowed.
 * All BroBot AI requests must go through the secure server proxy at /api/brobot/ask.
 *
 * This function now throws immediately to prevent accidental bypass of usage limits,
 * authentication, and guest tracking.
 */
export async function getBroBotResponse(
  _prompt: string,
  _signal?: AbortSignal
): Promise<BroBotPayload> {
  void _prompt;
  void _signal;

  throw new Error(
    'getBroBotResponse is deprecated. Use the secure /api/brobot/ask proxy instead. ' +
    'Direct browser calls to the external CasePrep API have been removed for security and monetization.'
  );
}
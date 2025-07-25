/* ─── src/lib/api.ts ────────────────────────────────────────── */
import type { BroBotPayload } from '@/types/caseprep';

const BASE = process.env.NEXT_PUBLIC_CASEPREP_API;

if (!BASE) {
  throw new Error('❌ NEXT_PUBLIC_CASEPREP_API is not defined in .env');
}

console.log('[BroBot] API base:', BASE);


/** POST the user prompt → receive structured JSON */
export async function getBroBotResponse(
  prompt: string,
  signal?: AbortSignal
): Promise<BroBotPayload> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), 40_000);

  try {
    const res = await fetch(`${BASE}/case-prep`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
      signal: signal ?? ctrl.signal,
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} - ${res.statusText}`);
    }

    const json = await res.json();

    if (!json.pimpQuestions || !Array.isArray(json.pimpQuestions)) {
      throw new Error('Invalid response: missing "pimpQuestions"');
    }

    const parsed: BroBotPayload = {
      pimpQuestions: json.pimpQuestions,
      otherUsefulFacts: json.otherUsefulFacts ?? [],
    };

    return parsed;
  } catch (e) {
    console.error('[BroBot API Error]', e);
    throw e;
  } finally {
    clearTimeout(id);
  }
}
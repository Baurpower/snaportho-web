/* ─── src/lib/api.ts ────────────────────────────────────────── */
import type { CasePrepPayload } from '@/types/caseprep';

const BASE = process.env.NEXT_PUBLIC_CASEPREP_API;

if (!BASE) {
  throw new Error('❌ NEXT_PUBLIC_CASEPREP_API is not defined in .env');
}

console.log('[CasePrep] API base:', BASE);

/** Parse markdown string into structured payload */
function extractSection(markdown: string, header: string): string[] {
  const pattern = new RegExp(`#+ ${header}\\n([\\s\\S]*?)(?=\\n#+ |$)`, 'i');
  const match = markdown.match(pattern);

  if (!match) return [];

  return match[1]
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
}

/** POST the user prompt → receive structured JSON */
export async function getCasePrepResponse(
  prompt: string,
  signal?: AbortSignal
): Promise<CasePrepPayload> {
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

    const parsed: CasePrepPayload = {
      pimpQuestions: json.pimpQuestions,
      otherUsefulFacts: json.otherUsefulFacts ?? [],
    };

    return parsed;
  } catch (e) {
    console.error('[CasePrep API Error]', e);
    throw e;
  } finally {
    clearTimeout(id);
  }
}
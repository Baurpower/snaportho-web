import { getOpenAI } from '@/lib/brobot/openai-client';
import { BROBOT_EVAL_MODEL } from '@/lib/brobot/model-config';
import { buildBroBotEvalMessages } from './prompt-builder';
import {
  BROBOT_CRITICAL_FAILURE_LABELS,
  BroBotEvalResultSchema,
  type BroBotEvalJobInput,
  type BroBotEvalResult,
  type BroBotFailureLabel,
} from './types';

function extractJsonObject(raw: string): string | null {
  const trimmed = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return trimmed;
  }

  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first === -1 || last === -1 || first >= last) {
    return null;
  }

  return trimmed.slice(first, last + 1);
}

const GENERIC_ANSWER_SCORE_CAP = 65;

function applyDeterministicOverrides(result: BroBotEvalResult): BroBotEvalResult {
  let next = result;

  const hasCriticalLabel = next.failure_labels.some((label) =>
    BROBOT_CRITICAL_FAILURE_LABELS.has(label as BroBotFailureLabel)
  );
  if (hasCriticalLabel) {
    next = { ...next, severity: 'critical', requires_admin_review: true };
  }

  // Defense in depth: don't rely solely on the model honoring the generic-answer
  // cap instructed in the prompt — enforce it here too.
  if (next.failure_labels.includes('too_generic') && next.overall_score > GENERIC_ANSWER_SCORE_CAP) {
    next = { ...next, overall_score: GENERIC_ANSWER_SCORE_CAP };
  }

  return next;
}

export async function runBroBotEvaluation(
  input: BroBotEvalJobInput
): Promise<BroBotEvalResult> {
  const openai = getOpenAI();
  const messages = buildBroBotEvalMessages(input);

  const completion = await openai.chat.completions.create({
    model: BROBOT_EVAL_MODEL,
    temperature: 0,
    response_format: { type: 'json_object' },
    messages,
  });

  const raw = completion.choices[0]?.message?.content ?? '';
  const json = extractJsonObject(raw);
  if (!json) {
    throw new Error('BroBot evaluator returned no parseable JSON object.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (error) {
    throw new Error(
      `BroBot evaluator returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  const validation = BroBotEvalResultSchema.safeParse(parsed);
  if (!validation.success) {
    throw new Error(`BroBot evaluator JSON failed schema validation: ${validation.error.message}`);
  }

  return applyDeterministicOverrides(validation.data);
}

export { BROBOT_EVAL_MODEL };

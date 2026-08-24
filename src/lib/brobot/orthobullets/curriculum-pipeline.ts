export type CurriculumPipelineStage =
  "chunk_generation" | "synthesis" | "response_parsing" | "usage_recording";

export type CurriculumPipelineErrorCode =
  | "model_unavailable"
  | "all_chunks_failed"
  | "synthesis_failed"
  | "parse_failure";

export class CurriculumPipelineError extends Error {
  constructor(
    public readonly code: CurriculumPipelineErrorCode,
    public readonly stage: CurriculumPipelineStage,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "CurriculumPipelineError";
  }
}

type ErrorLike = { status?: unknown; code?: unknown; message?: unknown };

export function curriculumErrorSummary(error: unknown) {
  const candidate =
    error && typeof error === "object" ? (error as ErrorLike) : null;
  const status =
    typeof candidate?.status === "number" ? candidate.status : null;
  const providerCode =
    typeof candidate?.code === "string" ? candidate.code : null;
  const message =
    error instanceof Error
      ? error.message
      : typeof candidate?.message === "string"
        ? candidate.message
        : "Unknown error";
  return { status, providerCode, message };
}

export function isTransientCurriculumError(error: unknown): boolean {
  const { status, providerCode, message } = curriculumErrorSummary(error);
  if (
    providerCode === "credit_balance_exhausted" ||
    /insufficient_quota|no credits remaining|credit balance/i.test(message)
  ) return false;
  if (
    status === 408 ||
    status === 409 ||
    status === 429 ||
    (status != null && status >= 500)
  )
    return true;
  if (
    providerCode &&
    /^(rate_limit_exceeded|timeout|server_error|connection_error)$/i.test(
      providerCode,
    )
  )
    return true;
  return /timeout|timed out|rate limit|connection (?:reset|error)|temporarily unavailable|fetch failed/i.test(
    message,
  );
}

export function isCurriculumModelUnavailableError(error: unknown): boolean {
  const { providerCode, message } = curriculumErrorSummary(error);
  return providerCode === "credit_balance_exhausted" ||
    /insufficient_quota|no credits remaining|credit balance|model .* (?:not found|unavailable)/i.test(message);
}

export async function withCurriculumRetry<T>(
  operation: () => Promise<T>,
  options: {
    retries?: number;
    baseDelayMs?: number;
    sleep?: (delayMs: number) => Promise<void>;
  } = {},
): Promise<T> {
  const retries = options.retries ?? 2;
  const baseDelayMs = options.baseDelayMs ?? 250;
  const sleep =
    options.sleep ??
    ((delayMs: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, delayMs)));
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= retries || !isTransientCurriculumError(error)) throw error;
      await sleep(baseDelayMs * 2 ** attempt + Math.floor(Math.random() * 100));
    }
  }
}

function strings(value: unknown, max = 12): string[] {
  return Array.isArray(value)
    ? value
        .filter(
          (item): item is string =>
            typeof item === "string" && Boolean(item.trim()),
        )
        .slice(0, max)
    : [];
}

/** Produce a valid, useful response when final synthesis is unavailable. */
export function buildPartialCurriculumResponse(
  chunkResults: Array<{ result: unknown }>,
  failedChunkCount: number,
): string {
  const notes = chunkResults
    .map(({ result }) =>
      result && typeof result === "object"
        ? (result as Record<string, unknown>)
        : null,
    )
    .filter((result): result is Record<string, unknown> => result != null);
  const takeaways = notes
    .map((note) =>
      typeof note.oneSentenceTakeaway === "string"
        ? note.oneSentenceTakeaway.trim()
        : "",
    )
    .filter(Boolean);
  const inThirtySeconds = notes
    .flatMap((note) => strings(note.inThirtySeconds, 5))
    .slice(0, 5);
  const mustKnow = notes
    .flatMap((note) => (Array.isArray(note.mustKnow) ? note.mustKnow : []))
    .slice(0, 8);
  const classifications = notes
    .flatMap((note) => (Array.isArray(note.classifications) ? note.classifications : []))
    .slice(0, 4);

  return JSON.stringify({
    oneSentenceTakeaway:
      takeaways[0] ||
      inThirtySeconds[0] ||
      "Review the high-yield points recovered from this page.",
    inThirtySeconds: inThirtySeconds.length
      ? inThirtySeconds
      : takeaways.slice(0, 5),
    classifications,
    mustKnow,
    clinicalPearls: notes
      .flatMap((note) => strings(note.clinicalPearls))
      .slice(0, 12),
    commonMistakes: notes
      .flatMap((note) => strings(note.commonMistakes))
      .slice(0, 8),
    attendingQuestions: notes
      .flatMap((note) =>
        Array.isArray(note.attendingQuestions) ? note.attendingQuestions : [],
      )
      .slice(0, 8),
    testableFacts: notes
      .flatMap((note) => strings(note.testableFacts))
      .slice(0, 16),
    miniQuiz: notes
      .flatMap((note) => (Array.isArray(note.miniQuiz) ? note.miniQuiz : []))
      .slice(0, 6),
    memoryHooks: notes.flatMap((note) => strings(note.memoryHooks)).slice(0, 6),
    deepDive: notes.flatMap((note) => strings(note.deepDive)).slice(0, 8),
    comparisonTable: notes.find((note) => note.comparisonTable)?.comparisonTable ?? null,
    suggestedFollowUps: notes
      .flatMap((note) => strings(note.suggestedFollowUps))
      .slice(0, 8),
    warnings: [
      `Partial explanation recovered from ${notes.length} section group${notes.length === 1 ? "" : "s"}.`,
      ...(failedChunkCount
        ? [
            `${failedChunkCount} section group${failedChunkCount === 1 ? "" : "s"} could not be processed.`,
          ]
        : []),
      "Final synthesis was unavailable; some duplication may remain.",
    ],
  });
}

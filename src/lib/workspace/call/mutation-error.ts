import {
  buildValidationResult,
  type CallValidationIssue,
  type CallValidationResult,
} from "@/lib/workspace/call/validation";

export type CallMutationErrorPayload = {
  error?: string;
  validation?: unknown;
  issues?: unknown;
  [key: string]: unknown;
};

export class CallMutationError extends Error {
  validation?: CallValidationResult | unknown;
  issues?: unknown;
  status?: number;
  payload?: CallMutationErrorPayload | null;

  constructor(message: string, options?: {
    validation?: CallValidationResult | unknown;
    issues?: unknown;
    status?: number;
    payload?: CallMutationErrorPayload | null;
  }) {
    super(message);
    this.name = "CallMutationError";
    this.validation = options?.validation;
    this.issues = options?.issues;
    this.status = options?.status;
    this.payload = options?.payload;
  }
}

function isValidationResultLike(value: unknown): value is CallValidationResult {
  if (typeof value !== "object" || value === null) return false;

  const candidate = value as {
    issues?: unknown;
    counts?: unknown;
    hasErrors?: unknown;
    hasWarnings?: unknown;
    isValid?: unknown;
  };

  return (
    Array.isArray(candidate.issues) &&
    typeof candidate.counts === "object" &&
    candidate.counts !== null &&
    typeof candidate.hasErrors === "boolean" &&
    typeof candidate.hasWarnings === "boolean" &&
    typeof candidate.isValid === "boolean"
  );
}

export function isCallMutationError(error: unknown): error is CallMutationError {
  return error instanceof CallMutationError;
}

export function getCallMutationValidation(error: unknown) {
  const candidates: unknown[] = [];

  if (error && typeof error === "object") {
    const record = error as {
      validation?: unknown;
      response?: { validation?: unknown } | null;
      payload?: { validation?: unknown } | null;
      cause?: unknown;
    };

    candidates.push(
      record.validation,
      record.response?.validation,
      record.payload?.validation
    );

    if (record.cause && typeof record.cause === "object") {
      candidates.push((record.cause as { validation?: unknown }).validation);
    }
  }

  for (const candidate of candidates) {
    if (isValidationResultLike(candidate)) {
      return candidate;
    }

    if (
      candidate &&
      typeof candidate === "object" &&
      Array.isArray((candidate as { issues?: unknown }).issues)
    ) {
      return buildValidationResult(
        (candidate as { issues: CallValidationIssue[] }).issues
      );
    }
  }

  return null;
}

export async function parseCallMutationResponse(
  response: Response,
  fallbackMessage: string
) {
  const payload = (await response.json().catch(() => null)) as
    | CallMutationErrorPayload
    | null;

  if (response.ok) {
    return payload;
  }

  throw new CallMutationError(payload?.error ?? fallbackMessage, {
    validation: payload?.validation,
    issues: payload?.issues,
    status: response.status,
    payload,
  });
}

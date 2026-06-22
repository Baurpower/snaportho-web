/**
 * Server-only configuration for CasePrep review proxy routes.
 */

export function getCasePrepReviewBaseUrl(): string {
  const configured = process.env.CASEPREP_INTERNAL_BASE_URL?.trim();

  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  if (process.env.NODE_ENV !== "production") {
    return "http://127.0.0.1:8000";
  }

  throw new Error(
    "CASEPREP_INTERNAL_BASE_URL is required in production for CasePrep review proxying."
  );
}

export function getCasePrepInternalApiKey(): string {
  const configured = process.env.CASEPREP_INTERNAL_API_KEY?.trim();

  if (configured) {
    return configured;
  }

  if (process.env.NODE_ENV !== "production") {
    return "";
  }

  throw new Error(
    "CASEPREP_INTERNAL_API_KEY is required in production for CasePrep review proxying."
  );
}

export const CASEPREP_INTERNAL_API_KEY_HEADER = "x-caseprep-internal-api-key";
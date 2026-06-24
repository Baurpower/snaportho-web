import {
  CASEPREP_INTERNAL_API_KEY_HEADER,
  getCasePrepInternalApiKey,
  getCasePrepReviewBaseUrl,
} from "@/lib/config/caseprep-review";
import type {
  ClinicalSectionItem,
  ProcedureDetail,
  RegistryIndex,
  SectionEditResponse,
} from "./types";

export class CasePrepRegistryNotFoundError extends Error {
  slug: string;

  constructor(slug: string) {
    super(`Procedure '${slug}' was not found.`);
    this.slug = slug;
  }
}

export class CasePrepRegistryUpstreamError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function buildHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  const apiKey = getCasePrepInternalApiKey();
  if (apiKey) {
    headers[CASEPREP_INTERNAL_API_KEY_HEADER] = apiKey;
  }

  return headers;
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { detail?: unknown; error?: unknown };
    if (typeof payload.detail === "string") {
      return payload.detail;
    }
    if (typeof payload.error === "string") {
      return payload.error;
    }
  } catch {
    // Fall through to generic message.
  }

  return `CasePrep registry request failed with status ${response.status}.`;
}

async function fetchRegistryJson<T>(
  path: string,
  options?: { notFoundSlug?: string }
): Promise<T> {
  const baseUrl = getCasePrepReviewBaseUrl();
  const response = await fetch(`${baseUrl}${path}`, {
    method: "GET",
    headers: buildHeaders(),
    cache: "no-store",
  });

  if (response.status === 404) {
    throw new CasePrepRegistryNotFoundError(options?.notFoundSlug ?? path);
  }

  if (!response.ok) {
    const message = await parseErrorMessage(response);
    throw new CasePrepRegistryUpstreamError(response.status, message);
  }

  return (await response.json()) as T;
}

export async function fetchRegistryIndex(): Promise<RegistryIndex> {
  return fetchRegistryJson<RegistryIndex>("/caseprep/registry/index");
}

export async function fetchRegistryProcedure(slug: string): Promise<ProcedureDetail> {
  const encodedSlug = encodeURIComponent(slug);
  return fetchRegistryJson<ProcedureDetail>(
    `/caseprep/registry/procedures/${encodedSlug}?include_validation=true`,
    { notFoundSlug: slug }
  );
}

export async function updateRegistrySection(
  slug: string,
  sectionKey: string,
  items: ClinicalSectionItem[]
): Promise<SectionEditResponse> {
  const baseUrl = getCasePrepReviewBaseUrl();
  const encodedSlug = encodeURIComponent(slug);
  const encodedKey = encodeURIComponent(sectionKey);

  const response = await fetch(
    `${baseUrl}/caseprep/registry/procedures/${encodedSlug}/sections/${encodedKey}`,
    {
      method: "PATCH",
      headers: {
        ...buildHeaders(),
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({ items }),
    }
  );

  if (response.status === 404) {
    throw new CasePrepRegistryNotFoundError(slug);
  }
  if (!response.ok) {
    const message = await parseErrorMessage(response);
    throw new CasePrepRegistryUpstreamError(response.status, message);
  }

  return (await response.json()) as SectionEditResponse;
}

export async function certifyRegistryProcedure(
  slug: string,
  certifiedBy: string,
  notes?: string
): Promise<ProcedureDetail> {
  const baseUrl = getCasePrepReviewBaseUrl();
  const encodedSlug = encodeURIComponent(slug);

  const response = await fetch(
    `${baseUrl}/caseprep/registry/procedures/${encodedSlug}/certify`,
    {
      method: "POST",
      headers: {
        ...buildHeaders(),
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({ certified_by: certifiedBy, notes: notes ?? null }),
    }
  );

  if (response.status === 404) {
    throw new CasePrepRegistryNotFoundError(slug);
  }
  if (!response.ok) {
    const message = await parseErrorMessage(response);
    throw new CasePrepRegistryUpstreamError(response.status, message);
  }

  return (await response.json()) as ProcedureDetail;
}
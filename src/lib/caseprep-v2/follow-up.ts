import { z } from "zod";

import { getCasePrepInternalBaseUrl } from "@/lib/config/brobot";

export const PinnedCasePrepSessionSchema = z.object({
  casePrepSessionId: z.string().min(1),
  canonicalSlug: z.string().min(1),
  canonicalName: z.string().min(1),
  approachIdentity: z.string().nullish(),
  revisionId: z.string().min(1),
  payloadHash: z.string().min(1),
  trainingLevel: z.string().nullish(),
  entrySurface: z.string().min(1),
  currentSection: z.string().nullish(),
});

export type PinnedCasePrepSession = z.infer<typeof PinnedCasePrepSessionSchema>;

const FollowUpResponseSchema = z.object({
  caseprep_version: z.literal("v2"),
  mode: z.literal("pinned_case_prep_follow_up"),
  case_prep_session_id: z.string(),
  canonical_slug: z.string(),
  canonical_name: z.string(),
  approach_identity: z.string().nullish(),
  revision_id: z.string(),
  payload_hash: z.string(),
  answer_status: z.enum(["curated", "not_in_curated_packet"]),
  message: z.string(),
  sections: z.array(
    z.object({ section_id: z.string(), content: z.unknown() })
  ),
  supplemental_retrieval_used: z.boolean(),
  citations: z.array(z.unknown()),
});

export async function requestPinnedCasePrepFollowUp(
  session: PinnedCasePrepSession,
  question: string
) {
  const pinned = PinnedCasePrepSessionSchema.parse(session);
  const response = await fetch(
    `${getCasePrepInternalBaseUrl()}/case-prep/v2/follow-up`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        case_prep_session_id: pinned.casePrepSessionId,
        canonical_slug: pinned.canonicalSlug,
        canonical_name: pinned.canonicalName,
        approach_identity: pinned.approachIdentity,
        revision_id: pinned.revisionId,
        payload_hash: pinned.payloadHash,
        training_level: pinned.trainingLevel,
        entry_surface: pinned.entrySurface,
        current_section: pinned.currentSection,
        question,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(45_000),
    }
  );
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail ?? "Pinned Case Prep session is unavailable.");
  }
  return FollowUpResponseSchema.parse(await response.json());
}

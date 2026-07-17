import { getCasePrepInternalBaseUrl } from "@/lib/config/brobot";
import {
  CasePrepV2EnvelopeSchema,
  type CasePrepV2Normalized,
} from "@/lib/caseprep-v2/schema";

export type CasePrepV2Request = {
  prompt: string;
  userId?: string | null;
  anonymousSessionId?: string | null;
  trainingLevel?: string | null;
  entrySurface: string;
  conversationId?: string | null;
  casePrepSessionId?: string | null;
};

export class CasePrepV2Error extends Error {}

export async function requestCasePrepV2(
  input: CasePrepV2Request
): Promise<CasePrepV2Normalized> {
  const response = await fetch(`${getCasePrepInternalBaseUrl()}/case-prep/v2`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: input.prompt,
      user_id: input.userId,
      anonymous_session_id: input.anonymousSessionId,
      training_level: input.trainingLevel,
      entry_surface: input.entrySurface,
      conversation_id: input.conversationId,
      case_prep_session_id: input.casePrepSessionId,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(45_000),
  });

  if (!response.ok) {
    throw new CasePrepV2Error(`Case Prep V2 returned ${response.status}.`);
  }

  const parsed = CasePrepV2EnvelopeSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new CasePrepV2Error("Case Prep V2 returned an invalid response contract.");
  }
  return parsed.data.case_prep;
}

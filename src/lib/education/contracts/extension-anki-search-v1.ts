import { z } from "zod";
import { normalizeResourceSearchNativeId } from "./resource-search-v1";

export const EXTENSION_ANKI_SEARCH_CONTRACT = "snaportho-extension-anki-search.v1" as const;

const PageSectionSearchSchema = z.object({
  id: z.string().trim().min(1).max(80),
  heading: z.string().trim().min(1).max(240),
  concepts: z.array(z.string().trim().min(2).max(80)).min(1).max(12),
  priority: z.number().int().min(1).max(5),
});

export const ExtensionAnkiSearchRequestSchema = z.object({
  contractVersion: z.literal(EXTENSION_ANKI_SEARCH_CONTRACT),
  clientRequestId: z.string().uuid(),
  idempotencyKey: z.string().uuid(),
  source: z.object({
    provider: z.literal("orthobullets"),
    queryKind: z.enum(["question", "topic_page"]).default("question"),
    nativeQuestionId: z.string().trim().min(1).max(200),
    questionFingerprintHash: z.string().regex(/^[a-f0-9]{64}$/),
  }),
  concept: z.object({
    testedConcept: z.string().trim().min(1).max(300),
    summary: z.string().trim().min(1).max(600),
    searchKeywords: z.array(z.string().trim().min(3).max(80)).max(24).default([]),
    pageSections: z.array(PageSectionSearchSchema).max(30).default([]),
    source: z.enum(["brobot_explanation", "user_edited", "page_metadata"]),
  }),
  requestedAction: z.literal("open_browse_and_return_results"),
  extensionVersion: z.string().trim().min(1).max(100),
  createdAt: z.string().datetime(),
}).superRefine((value, ctx) => {
  if (value.source.queryKind === "topic_page" && value.concept.pageSections.length === 0) {
    ctx.addIssue({
      code: "custom",
      path: ["concept", "pageSections"],
      message: "Topic-page searches require structured page sections.",
    });
  }
});

export type ExtensionAnkiSearchRequestV1 = z.infer<typeof ExtensionAnkiSearchRequestSchema>;

export function normalizedSearchId(input: ExtensionAnkiSearchRequestV1) {
  return normalizeResourceSearchNativeId(input.source.provider, input.source.nativeQuestionId);
}

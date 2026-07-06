import type { ProposalRecord } from "../../../../kg-automation-common.ts";
import type { EvidenceItem, KnowledgeEvidencePacket } from "../../kg-evidence/evidence-packet.ts";
import type { EvidenceAgentContext } from "../../kg-evidence/evidence-packet.ts";
import type { NeighborhoodSnapshot, OntologyGap } from "../../kg-compiler/types.ts";
import { validateAtomicity, splitListAssertions } from "./claim-atomicity.ts";
import {
  classifyClaimType,
  parseSectionHint,
  type ClaimType,
  type SectionHint,
} from "./claim-type-classifier.ts";
import {
  buildUncertaintyNote,
  inferContextRelevance,
  inferImportanceLevel,
  inferLearnerStage,
  inferWhyItMatters,
  resolvePrimaryEntitySlug,
} from "./claim-inference.ts";
import { routeClaimReview, scoreClaimConfidence } from "./claim-confidence.ts";

export type ClaimCandidate = {
  draftId: string;
  claimText: string;
  claimType: ClaimType;
  primaryEntitySlug: string;
  importanceLevel: "L1" | "L2" | "L3" | "L4";
  whyItMatters: string[];
  contextRelevance: string[];
  learnerStage: string;
  evidenceItemIds: string[];
  section: SectionHint;
  gapId?: string;
  atomicityScore: number;
  uncertaintyNote?: string;
  confidence: number;
  reviewRoute: string;
};

export type ExtractionResult = {
  candidates: ClaimCandidate[];
  rejected: Array<{ text: string; reason: string; suggestDecisionPoint: boolean; evidenceItemIds: string[] }>;
  redirectedToDp: string[];
};

function fingerprint(parts: string[]): string {
  return parts.join("|").toLowerCase().replace(/\s+/g, " ");
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

type ExtractedText = { text: string; subSection: SectionHint };

function extractTextsFromPayload(
  sectionRoot: string,
  payload: Record<string, unknown>
): ExtractedText[] {
  const results: ExtractedText[] = [];

  if (sectionRoot === "learning_objectives" && Array.isArray(payload.objectives)) {
    for (const obj of payload.objectives) {
      results.push({ text: String(obj), subSection: "learning_objectives" });
    }
    return results;
  }

  if (sectionRoot === "metadata") return results;

  const fastKeys = ["mustKnow", "anatomyFocus", "oneLiner", "pimpQuestions", "orSurvivalTips", "caseSteps"];
  const deepKeys = [
    "anatomy",
    "classification",
    "imaging",
    "decisionMaking",
    "treatmentOptions",
    "boardPearls",
    "complications",
  ];

  const keys = sectionRoot === "fast" ? fastKeys : sectionRoot === "deep" ? deepKeys : [];

  for (const key of keys) {
    const subSection = parseSectionHint(`${sectionRoot}.${key}`);
    const bucket = payload[key];
    if (Array.isArray(bucket)) {
      for (const item of bucket) results.push({ text: String(item), subSection });
    } else if (typeof bucket === "string") {
      results.push({ text: bucket, subSection });
    }
  }

  return results;
}

function averageEvidenceQuality(
  itemIds: string[],
  hints: Record<string, number>
): number {
  if (itemIds.length === 0) return 0.65;
  const sum = itemIds.reduce((s, id) => s + (hints[id] ?? 0.7), 0);
  return sum / itemIds.length;
}

function gapMatchesCandidate(gap: OntologyGap, candidate: ClaimCandidate): boolean {
  if (gap.anchorEntitySlug && candidate.primaryEntitySlug !== gap.anchorEntitySlug) {
    const primary = gap.anchorEntitySlug;
    if (primary !== candidate.primaryEntitySlug && !gap.claimType) return false;
  }
  if (gap.claimType) {
    const types = gap.claimType.split("|");
    if (!types.includes(candidate.claimType)) return false;
  }
  return true;
}

export function extractClaimCandidatesFromEvidence(
  packet: KnowledgeEvidencePacket | undefined,
  evidenceContext: EvidenceAgentContext | undefined,
  gaps: OntologyGap[],
  snapshot: NeighborhoodSnapshot
): ExtractionResult {
  const candidates: ClaimCandidate[] = [];
  const rejected: ExtractionResult["rejected"] = [];
  const redirectedToDp: string[] = [];

  const relevantIds = new Set(evidenceContext?.relevantEvidenceItemIds ?? []);
  const hints = evidenceContext?.confidenceHints ?? {};

  const prepareItems: EvidenceItem[] =
    packet?.sourceEvidence.filter(
      (e) =>
        e.sourceType === "static_prepare" &&
        (relevantIds.size === 0 || relevantIds.has(e.evidenceId))
    ) ?? [];

  const primarySlug = snapshot.primaryEntitySlug;
  const learnerStage = inferLearnerStage(
    packet?.topicContext.displayName,
    packet?.topicContext.aliases[0]
  );

  for (const item of prepareItems) {
    const sectionRoot = String(item.payload.section ?? "unknown");
    const extracted = extractTextsFromPayload(sectionRoot, item.payload);

    for (const { text: raw, subSection: section } of extracted) {
      const textParts = section === "fast.mustKnow" ? splitListAssertions(raw) : [raw];

      for (const text of textParts) {
        const classified = classifyClaimType(text, section);
        if (classified === "reject_management") {
          rejected.push({
            text,
            reason: "MANAGEMENT_LOGIC",
            suggestDecisionPoint: true,
            evidenceItemIds: [item.evidenceId],
          });
          redirectedToDp.push(text);
          continue;
        }
        if (classified === "reject_question") {
          rejected.push({
            text,
            reason: "QUESTION_FORM",
            suggestDecisionPoint: false,
            evidenceItemIds: [item.evidenceId],
          });
          continue;
        }

        const atomicity = validateAtomicity(text);
        if (!atomicity.atomic) {
          rejected.push({
            text,
            reason: atomicity.issues.join("; "),
            suggestDecisionPoint: atomicity.suggestDecisionPoint,
            evidenceItemIds: [item.evidenceId],
          });
          if (atomicity.suggestDecisionPoint) redirectedToDp.push(text);
          continue;
        }

        const claimType = classifyClaimType(text, section);
        const anchor = resolvePrimaryEntitySlug(text, primarySlug);
        const matchingGap = gaps.find((g) =>
          gapMatchesCandidate(g, {
            draftId: "",
            claimText: text,
            claimType,
            primaryEntitySlug: resolvePrimaryEntitySlug(text, primarySlug, g.anchorEntitySlug),
            importanceLevel: "L1",
            whyItMatters: [],
            contextRelevance: [],
            learnerStage,
            evidenceItemIds: [item.evidenceId],
            section,
            atomicityScore: 1,
            confidence: 0,
            reviewRoute: "",
          })
        );
        if (claimType === "reject_management" || claimType === "reject_question") continue;

        const resolvedAnchor = resolvePrimaryEntitySlug(
          text,
          primarySlug,
          matchingGap?.anchorEntitySlug
        );
        const importance = inferImportanceLevel(claimType, section, matchingGap);
        const whyItMatters = inferWhyItMatters(text, claimType);
        if (importance === "L1" && whyItMatters.length === 0) {
          rejected.push({
            text,
            reason: "MISSING_WHY_IT_MATTERS",
            suggestDecisionPoint: false,
            evidenceItemIds: [item.evidenceId],
          });
          continue;
        }

        const evidenceItemIds = [item.evidenceId];
        const evidenceQuality = averageEvidenceQuality(evidenceItemIds, hints);
        const confidenceResult = scoreClaimConfidence({
          claimType,
          importanceLevel: importance,
          evidenceQuality,
          sourceAgreement: 0.85,
          atomicityScore: atomicity.sentenceCount <= 1 ? 1 : 0.85,
          ontologyFit: snapshot.entities.some((e) => e.slug === resolvedAnchor) ? 0.95 : 0.7,
          text,
          whyItMatters,
          evidenceItemCount: evidenceItemIds.length,
        });

        const draftId = `claim-${slugify(resolvedAnchor)}-${claimType}-${slugify(text).slice(0, 24)}`;

        candidates.push({
          draftId,
          claimText: text.endsWith(".") ? text : `${text}.`,
          claimType,
          primaryEntitySlug: resolvedAnchor,
          importanceLevel: importance,
          whyItMatters,
          contextRelevance: inferContextRelevance(section, claimType),
          learnerStage,
          evidenceItemIds,
          section,
          gapId: matchingGap?.id,
          atomicityScore: atomicity.sentenceCount <= 1 ? 1 : 0.85,
          uncertaintyNote: buildUncertaintyNote(section, evidenceItemIds.length),
          confidence: confidenceResult.confidence,
          reviewRoute: confidenceResult.recommendedRoute,
        });
      }
    }
  }

  const deduped = new Map<string, ClaimCandidate>();
  for (const c of candidates) {
    const key = fingerprint([c.primaryEntitySlug, c.claimType, c.claimText]);
    if (!deduped.has(key)) deduped.set(key, c);
  }

  return {
    candidates: [...deduped.values()],
    rejected,
    redirectedToDp: [...new Set(redirectedToDp)],
  };
}

export function claimCandidateToProposal(
  candidate: ClaimCandidate,
  pilotKey: string,
  packetId?: string
): ProposalRecord {
  return {
    proposal_fingerprint: fingerprint(["claim", candidate.draftId]),
    proposal_type: "propose_educational_claim",
    source_signal_type: "evidence_packet",
    source_signal_ids: candidate.evidenceItemIds,
    specialty_id: null,
    proposed_entity_type: null,
    proposed_entity_label: null,
    proposed_existing_entity_id: null,
    proposed_subject_entity_id: null,
    proposed_predicate: null,
    proposed_object_entity_id: null,
    proposed_alias: null,
    proposed_bridge_type: null,
    confidence: candidate.confidence,
    confidence_tier: candidate.confidence >= 0.8 ? "high" : candidate.confidence >= 0.65 ? "medium" : "low",
    confidence_reason: "claim_builder_evidence_v2",
    evidence_summary: `Generated from evidence items: ${candidate.evidenceItemIds.join(", ")}`,
    supporting_card_count: 0,
    supporting_question_count: 0,
    supporting_curriculum_node_count: 1,
    supporting_source_count: candidate.evidenceItemIds.length,
    conflict_count: 0,
    review_status: "needs_review",
    reviewed_by: null,
    reviewed_at: null,
    reviewer_notes: null,
    applied_at: null,
    superseded_by: null,
    comments: null,
    is_active: true,
    metadata: {
      pilot: pilotKey,
      draft_id: candidate.draftId,
      claim_type: candidate.claimType,
      claim_text: candidate.claimText,
      primary_entity_slug: candidate.primaryEntitySlug,
      importance_level: candidate.importanceLevel,
      content_source: "generated_draft",
      verified: false,
      why_it_matters: candidate.whyItMatters,
      context_relevance: candidate.contextRelevance,
      learner_stage: candidate.learnerStage,
      evidence_item_ids: candidate.evidenceItemIds,
      evidence_packet_id: packetId,
      uncertainty_note: candidate.uncertaintyNote,
      review_route_hint: candidate.reviewRoute,
      generated_by: "claim-builder-v2",
      publication_eligible: false,
    },
  };
}
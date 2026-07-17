import type {
  BroBotKgCandidate,
  BroBotKgFact,
  BroBotKgGapSignal,
  BroBotKgRetrievalStatus,
} from "./contracts";
import { normalizeKgQuery } from "./cache";

export function classifyBroBotKgGaps(input: {
  query: string;
  status: BroBotKgRetrievalStatus;
  candidates: BroBotKgCandidate[];
  facts: BroBotKgFact[];
  coverage: "full" | "partial" | "unknown";
  requiredPredicateFamilies: string[];
}): BroBotKgGapSignal[] {
  const gaps: BroBotKgGapSignal[] = [];
  const normalizedConcept = normalizeKgQuery(input.query).slice(0, 160);
  const top = input.candidates[0];

  if (input.status === "miss" && input.candidates.length === 0) {
    gaps.push({
      gapType: "missing_entity",
      normalizedConcept,
      confidence: 0.8,
      reasons: ["graph_eligible_query_without_candidate"],
    });
    gaps.push({
      gapType: "missing_neighborhood",
      normalizedConcept,
      confidence: 0.55,
      reasons: ["no_candidate_neighborhood"],
    });
  }
  if (top && top.finalScore < 0.55) {
    gaps.push({
      gapType: "weak_candidate_ranking",
      normalizedConcept,
      candidateEntityId: top.entityId,
      candidateNeighborhood: top.neighborhoodSlugs[0],
      confidence: 1 - top.finalScore,
      reasons: ["top_candidate_below_injection_threshold"],
    });
  }
  if (input.candidates.length > 0 && input.facts.length === 0) {
    gaps.push({
      gapType: "empty_packet_after_filtering",
      normalizedConcept,
      candidateEntityId: top?.entityId,
      candidateNeighborhood: top?.neighborhoodSlugs[0],
      confidence: 0.85,
      reasons: ["candidate_found_without_allowed_relationships"],
    });
  }
  if (input.coverage === "partial") {
    gaps.push({
      gapType: "partial_neighborhood_coverage",
      normalizedConcept,
      candidateEntityId: top?.entityId,
      candidateNeighborhood: top?.neighborhoodSlugs[0],
      confidence: 0.9,
      reasons: ["production_neighborhood_marked_partial"],
    });
  }

  const returnedPredicates = new Set(input.facts.map((fact) => fact.predicate));
  const missingFamilies = input.requiredPredicateFamilies.filter(
    (predicate) => !returnedPredicates.has(predicate)
  );
  if (top && missingFamilies.length === input.requiredPredicateFamilies.length) {
    gaps.push({
      gapType: "missing_predicate_family",
      normalizedConcept,
      candidateEntityId: top.entityId,
      candidateNeighborhood: top.neighborhoodSlugs[0],
      confidence: 0.65,
      reasons: missingFamilies.slice(0, 8).map((predicate) => `missing:${predicate}`),
    });
  }

  // The pinned beta release explicitly has no active claims or decision points.
  if (top) {
    gaps.push({
      gapType: "missing_claim",
      normalizedConcept,
      candidateEntityId: top.entityId,
      candidateNeighborhood: top.neighborhoodSlugs[0],
      confidence: 0.5,
      reasons: ["active_release_has_zero_claims"],
    });
    gaps.push({
      gapType: "missing_decision_point",
      normalizedConcept,
      candidateEntityId: top.entityId,
      candidateNeighborhood: top.neighborhoodSlugs[0],
      confidence: 0.5,
      reasons: ["active_release_has_zero_decision_points"],
    });
  }

  return gaps;
}

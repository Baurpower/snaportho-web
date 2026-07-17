import type { AliasEntry, PriorReviewDecision } from "./types.ts";
import { normalizeText } from "./utils.ts";

export type ReviewInheritanceCandidate = {
  fingerprint: string;
  alternateFingerprints: string[];
  proposalType: string;
  riskClass?: string;
  evidenceClass?: string;
  canonicalSubject?: string;
  canonicalPredicate?: string;
  canonicalObject?: string;
  text?: string;
};

export type ReviewInheritanceDecision = {
  fingerprint: string;
  matchedPriorFingerprint?: string;
  mode: "exact" | "semantic" | "rejection_pattern" | "none";
  inheritedDecision?: string;
  reason: string;
};

export function canonicalSemanticKey(candidate: ReviewInheritanceCandidate, aliases: AliasEntry[] = []): string {
  const aliasMap = new Map(aliases.filter((alias) => alias.confidence >= 0.92).map((alias) => [normalizeText(alias.alias), alias.canonicalSlug]));
  const subject = aliasMap.get(normalizeText(candidate.canonicalSubject)) ?? candidate.canonicalSubject ?? "";
  const object = aliasMap.get(normalizeText(candidate.canonicalObject)) ?? candidate.canonicalObject ?? "";
  return [
    candidate.proposalType,
    normalizeText(subject),
    normalizeText(candidate.canonicalPredicate),
    normalizeText(object),
    normalizeText(candidate.riskClass),
    normalizeText(candidate.evidenceClass),
  ].join("|");
}

export function inheritReviewDecision(
  candidate: ReviewInheritanceCandidate,
  prior: Map<string, PriorReviewDecision>,
  semanticPrior: Map<string, PriorReviewDecision>,
  aliases: AliasEntry[] = []
): ReviewInheritanceDecision {
  const exact = [candidate.fingerprint, ...candidate.alternateFingerprints].find((fingerprint) => prior.has(fingerprint));
  if (exact) {
    const decision = prior.get(exact);
    return {
      fingerprint: candidate.fingerprint,
      matchedPriorFingerprint: exact,
      mode: String(decision?.decision).includes("REJECT") ? "rejection_pattern" : "exact",
      inheritedDecision: decision?.decision,
      reason: "Exact fingerprint matched a prior review decision.",
    };
  }

  const semanticKey = canonicalSemanticKey(candidate, aliases);
  const semantic = semanticPrior.get(semanticKey);
  if (!semantic) {
    return { fingerprint: candidate.fingerprint, mode: "none", reason: "No safe exact or semantic prior review match." };
  }
  if (/REJECT/i.test(semantic.decision)) {
    return {
      fingerprint: candidate.fingerprint,
      matchedPriorFingerprint: semantic.proposal_fingerprint,
      mode: "rejection_pattern",
      inheritedDecision: semantic.decision,
      reason: "Prior structural rejection pattern reused for same semantic proposal.",
    };
  }
  return {
    fingerprint: candidate.fingerprint,
    matchedPriorFingerprint: semantic.proposal_fingerprint,
    mode: "semantic",
    inheritedDecision: semantic.decision,
    reason: "Canonical subject/predicate/object and risk/evidence classes match prior review.",
  };
}

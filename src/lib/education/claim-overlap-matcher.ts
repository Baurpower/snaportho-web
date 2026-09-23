import {
  CLAIM_OVERLAP_ALGORITHM,
  CLAIM_OVERLAP_DELTA,
  CLAIM_OVERLAP_MAX_CARDS,
  CLAIM_OVERLAP_TAU,
  isSafetyHoldClaim,
  type ClaimOverlapQuery,
} from "./contracts/claim-overlap-v1";
import {
  type CardClaimLinkV1,
  type ClinicalClaimQualifiers,
  type ClinicalClaimRecordV1,
} from "./contracts/clinical-claim-v1";

export type ClaimOverlapInventoryCard = {
  canonicalCardId: string;
  canonicalCardVersionId: string;
  noteGuid: string;
  cardOrdinal: number;
  active: boolean;
  currentVersion: boolean;
  atomic: boolean;
  deprecated?: boolean;
  contradictsClaim?: boolean;
};

export type ClaimOverlapInventory = {
  claims: ClinicalClaimRecordV1[];
  links: CardClaimLinkV1[];
  cards: ClaimOverlapInventoryCard[];
};

export type ClaimOverlapRankedCard = {
  canonicalCardId: string;
  canonicalCardVersionId: string;
  noteGuid: string;
  cardOrdinal: number;
  rank: 1 | 2 | 3;
  score: number;
  role: "must_learn" | "supports_understanding";
};

export type ClaimOverlapMatch = {
  algorithmVersion: typeof CLAIM_OVERLAP_ALGORITHM;
  disposition: "served" | "abstain" | "no_card";
  reasonCodes: string[];
  claimId: string | null;
  claimVersionId: string | null;
  matchScore: number | null;
  cards: ClaimOverlapRankedCard[];
};

function qualifiersCompatible(query: ClinicalClaimQualifiers, claim: ClinicalClaimQualifiers): boolean {
  const keys = new Set([...Object.keys(query), ...Object.keys(claim)]);
  for (const key of keys) {
    const left = query[key as keyof ClinicalClaimQualifiers];
    const right = claim[key as keyof ClinicalClaimQualifiers];
    if (left && right && left !== right) return false;
  }
  return true;
}

function claimMatchScore(query: ClaimOverlapQuery, claim: ClinicalClaimRecordV1): number {
  if (!claim.isActive) return 0;
  if (claim.fingerprintHash === query.fingerprintHash) return 1;
  if (claim.claimType !== query.claimType || claim.primaryEntityId !== query.primaryEntityId) return 0;
  if (!qualifiersCompatible(query.qualifiers, claim.qualifiers)) return 0;
  if (claim.predicate === query.predicate) return 0.85;
  return 0.7;
}

function cardScore(link: CardClaimLinkV1, card: ClaimOverlapInventoryCard): number | null {
  if (!link.isActive || !card.active || !card.currentVersion) return null;
  if (card.deprecated || card.contradictsClaim) return null;
  if (link.reviewStatus === "rejected" || link.reviewStatus === "superseded" || link.reviewStatus === "needs_review") {
    return null;
  }
  if (link.mappingRole !== "teaches") return null;
  return Number((
    1 * link.confidence
    + 0.2 * (card.atomic ? 1 : 0)
    + 0.1 * (card.currentVersion ? 1 : 0)
    + 0.1
  ).toFixed(4));
}

export function matchClaimOverlap(
  query: ClaimOverlapQuery,
  inventory: ClaimOverlapInventory,
): ClaimOverlapMatch {
  const scored = inventory.claims
    .map((claim) => ({ claim, score: claimMatchScore(query, claim) }))
    .filter((row) => row.score > 0)
    .sort((left, right) => right.score - left.score || left.claim.claimId.localeCompare(right.claim.claimId));
  const top = scored[0];
  const rival = scored[1];
  const empty = (
    disposition: ClaimOverlapMatch["disposition"],
    reasonCodes: string[],
  ): ClaimOverlapMatch => ({
    algorithmVersion: CLAIM_OVERLAP_ALGORITHM,
    disposition,
    reasonCodes,
    claimId: top?.claim.claimId ?? null,
    claimVersionId: top?.claim.currentVersionId ?? null,
    matchScore: top?.score ?? null,
    cards: [],
  });

  if (!top || top.score < CLAIM_OVERLAP_TAU) {
    return empty("abstain", top ? ["below_tau"] : ["no_claim_match"]);
  }
  if (rival && top.score - rival.score < CLAIM_OVERLAP_DELTA) {
    return empty("abstain", ["competing_claims_within_delta"]);
  }
  if (isSafetyHoldClaim({
    claimType: top.claim.claimType,
    qualifiers: top.claim.qualifiers,
    format: query.questionFormat,
  })) {
    return empty("abstain", ["safety_hold"]);
  }

  const cardsById = new Map(inventory.cards.map((card) => [card.canonicalCardId, card]));
  const eligible = inventory.links
    .filter((link) => link.claimId === top.claim.claimId)
    .map((link) => {
      const card = cardsById.get(link.canonicalCardId);
      if (!card || card.canonicalCardVersionId !== link.canonicalCardVersionId) return null;
      const score = cardScore(link, card);
      if (score == null) return null;
      return { link, card, score };
    })
    .filter((row): row is { link: CardClaimLinkV1; card: ClaimOverlapInventoryCard; score: number } => row != null)
    .sort((left, right) => (
      right.score - left.score
      || left.card.noteGuid.localeCompare(right.card.noteGuid)
      || left.card.cardOrdinal - right.card.cardOrdinal
      || left.card.canonicalCardId.localeCompare(right.card.canonicalCardId)
    ));

  const selected: ClaimOverlapRankedCard[] = [];
  const seenNotes = new Set<string>();
  for (const row of eligible) {
    if (selected.length >= CLAIM_OVERLAP_MAX_CARDS) break;
    if (seenNotes.has(row.card.noteGuid)) continue;
    seenNotes.add(row.card.noteGuid);
    const rank = (selected.length + 1) as 1 | 2 | 3;
    selected.push({
      canonicalCardId: row.card.canonicalCardId,
      canonicalCardVersionId: row.card.canonicalCardVersionId,
      noteGuid: row.card.noteGuid,
      cardOrdinal: row.card.cardOrdinal,
      rank,
      score: row.score,
      role: rank === 1 ? "must_learn" : "supports_understanding",
    });
  }

  if (selected.length === 0) {
    return empty("no_card", ["no_adequate_card"]);
  }
  return {
    algorithmVersion: CLAIM_OVERLAP_ALGORITHM,
    disposition: "served",
    reasonCodes: ["exact_or_high_confidence_claim", "approved_teaches_link"],
    claimId: top.claim.claimId,
    claimVersionId: top.claim.currentVersionId,
    matchScore: top.score,
    cards: selected,
  };
}

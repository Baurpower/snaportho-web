import {
  clinicalClaimFingerprintHash,
  containsProtectedEducationalContent,
  isCardClaimLinkV1,
  isClinicalClaimRecordV1,
  type CardClaimLinkV1,
  type ClinicalClaimQualifiers,
  type ClinicalClaimRecordV1,
  type ClinicalClaimType,
  type EducationalClaimGapV1,
} from "./contracts/clinical-claim-v1";
import { checksum } from "./deck-mapping-factory";
import { containsUnsafeMetadata, deterministicUuid } from "./deck-foundation";
import {
  assertDurableSemanticSafe,
  canonicalContentHash,
  normalizeClinicalText,
  runSemanticCard,
  stripNonClinicalMarkup,
  validateEphemeralCard,
  type EntityIndexRow,
  type EphemeralCard,
  type SemanticCardResult,
  type SemanticCritic,
  type SemanticResolution,
} from "./deck-semantic-mapping";

export const CARD_CLAIM_FACTORY_CONTRACT_VERSION = "snaportho-card-claim-factory.v1" as const;
export const CARD_CLAIM_FACTORY_IMPLEMENTATION_VERSION = "2026-09-23.1" as const;
export const UNRESOLVED_CLAIM_ENTITY_ID = "00000000-0000-4000-8000-000000000001" as const;
export const CARD_CLAIM_FACTORY_ALGORITHM = "card-claim-factory.v1" as const;

/** Minimum normalized length for direct proposed-entity generation. Kept, not weakened. */
export const PROPOSED_ENTITY_MIN_NORMALIZED_LENGTH = 4 as const;
/** Minimum confidence for a proposed entity to back an auto-approved teaches link. */
export const PROPOSED_ENTITY_AUTO_APPROVE_CONFIDENCE = 0.6 as const;
export const SHORT_LABEL_INSUFFICIENT_CONTEXT = "short_label_insufficient_context" as const;
export const ONTOLOGY_GAP_FILLED_REASON = "ontology_gap_filled" as const;
export const ONTOLOGY_GAP_FILLED_APPROVAL_REASON = "ontology_gap_filled_from_cloze_answer" as const;

export const CARD_CLAIM_FACTORY_QUEUES = [
  "auto_approved",
  "non_atomic",
  "competing_entities",
  "negated_or_distractor",
  "missing_entity",
  "qualifier_conflict",
  "duplicate_sibling",
  "extraction_failed",
  "inactive_or_stale",
  "cross_card_contradiction",
  "insufficient_content",
] as const;

export type CardClaimFactoryQueue = (typeof CARD_CLAIM_FACTORY_QUEUES)[number];

export type CardClaimFactoryCard = EphemeralCard & {
  noteGuid: string;
  active: boolean;
  currentVersion: boolean;
  inclusionStatus?: "included" | "excluded" | "withdrawn";
};

export type ExistingClaimRef = {
  claimId: string;
  currentVersionId: string;
  fingerprintHash: string;
};

export type ExtractedCloze = {
  clozeNumber: number;
  answer: string;
  filledText: string;
  clozeNumbers: number[];
};

export type EntityTargetType = "canonical" | "proposed" | "unresolved";

export type ProposedFactoryClaim = ClinicalClaimRecordV1 & {
  evidenceLocator: "cloze" | "extra";
  evidenceHash: string;
  /** Explicit entity-target kind so downstream code never infers it from ID format. */
  entityTargetType: EntityTargetType;
};

export type CanonicalMatchAttempt = {
  label: string;
  matchType: "preferred_label" | "alias" | "normalized_cloze";
  matchedEntityId: string | null;
};

export type ProposedEntityDerivation =
  | "cloze_answer_direct"
  | "normalized_cloze_answer"
  | "short_acronym_expansion"
  | "short_acronym_recognized";

export type ProposedOntologyEntity = {
  entityId: string;
  preferredLabel: string;
  normalizedLabel: string;
  entityType: string;
  source: "card_cloze";
  filledFromCardId: string;
  /** All source cards attached to this entity across the run (dedup provenance). */
  sourceCardIds: string[];
  sourceDeckId?: string;
  /** Original cloze text, preserved separately from the normalized label. */
  rawClozeText: string;
  generatedAt: string;
  resolutionReason: "no_canonical_match";
  derivation: ProposedEntityDerivation;
  confidence: number;
  canonicalMatchAttempts: CanonicalMatchAttempt[];
  status: "proposed";
  /** Contextual-specificity verdict, assessed after entity-likeness passes. */
  contextuallySpecific: true | false | "uncertain";
  specificityReasons: SpecificityReason[];
};

/* ---- Promotion boundary (future, not wired) ----
   Canonical resolution and proposed-entity generation (above) are the only
   stages that run. Review and canonical promotion do not exist yet: nothing in
   this module writes to canonical entities, and no promotion path is called.
   When human-reviewed promotion is built, it should consume
   ProposedEntityPromotionPacket and leave generation untouched. */
export const PROPOSED_ENTITY_STATUSES = [
  "proposed",
  "in_review",
  "approved_for_promotion",
  "promoted",
  "rejected",
] as const;

export type ProposedEntityStatus = (typeof PROPOSED_ENTITY_STATUSES)[number];

export type ProposedEntityPromotionPacket = {
  proposedEntityId: string;
  entityType: string;
  preferredLabel: string;
  normalizedLabel: string;
  supportingCardIds: string[];
  supportingClaimIds: string[];
  confidence: number;
  derivation: ProposedEntityDerivation;
};

/** Pure preview helper for a future human-reviewed promotion flow. Not called by the factory. */
export function buildPromotionPacket(
  entity: ProposedOntologyEntity,
  supportingClaimIds: string[],
): ProposedEntityPromotionPacket {
  return {
    proposedEntityId: entity.entityId,
    entityType: entity.entityType,
    preferredLabel: entity.preferredLabel,
    normalizedLabel: entity.normalizedLabel,
    supportingCardIds: [...entity.sourceCardIds],
    supportingClaimIds: [...supportingClaimIds],
    confidence: entity.confidence,
    derivation: entity.derivation,
  };
}

export type CardClaimFactoryAssignment = {
  canonicalCardId: string;
  canonicalCardVersionId: string;
  noteGuid: string;
  cardOrdinal: number;
  contentHash: string;
  queue: CardClaimFactoryQueue;
  reasonCodes: string[];
  fingerprintHash: string | null;
};

export type CardClaimFactoryOutput = {
  contractVersion: typeof CARD_CLAIM_FACTORY_CONTRACT_VERSION;
  algorithmVersion: typeof CARD_CLAIM_FACTORY_ALGORITHM;
  factoryRunId: string;
  dryRun: true;
  proposedClaims: ProposedFactoryClaim[];
  proposedEntities: ProposedOntologyEntity[];
  autoApprovedLinks: CardClaimLinkV1[];
  assignments: CardClaimFactoryAssignment[];
  exceptionQueue: CardClaimFactoryAssignment[];
  gaps: EducationalClaimGapV1[];
  machineReviews: Array<{
    canonicalCardId: string;
    reviewerType: string;
    decision: SemanticCritic["decision"];
    reasonCodes: string[];
  }>;
  metrics: {
    cardsProcessed: number;
    autoApprovedCards: number;
    autoApprovedLinks: number;
    proposedClaims: number;
    ontologyFills: number;
    exceptionCards: number;
    mergedClaimCount: number;
    canonicalEntityMatches: number;
    proposedEntitiesCreated: number;
    proposedEntitiesReused: number;
    cardsAttachedToProposedEntities: number;
    shortLabelInsufficientContext: number;
    entityLikenessBlocked: number;
    contextSpecificityBlocked: number;
    openMissingEntity: number;
  };
};

const CLOZE_RE = /\{\{c(\d+)::([^{}]*?)(?:::[^{}]*?)?\}\}/gi;
const TEXT_FIELDS = new Set(["text", "front"]);

function teachingField(card: EphemeralCard): { name: string; rawValue: string; plainText: string } | null {
  const preferred = card.fields.find((field) => TEXT_FIELDS.has(field.name.toLowerCase()))
    ?? card.fields.find((field) => field.rawValue.includes("{{c"))
    ?? card.fields[0];
  if (!preferred) return null;
  return {
    name: preferred.name,
    rawValue: preferred.rawValue,
    plainText: preferred.plainText ?? preferred.rawValue,
  };
}

export function extractTargetCloze(raw: string, cardOrdinal: number): ExtractedCloze | null {
  const clozeNumber = cardOrdinal + 1;
  const numbers = new Set<number>();
  let targetAnswer: string | null = null;
  const filledText = raw.replace(CLOZE_RE, (_match, rawNumber: string, answer: string) => {
    const number = Number(rawNumber);
    numbers.add(number);
    if (number === clozeNumber && targetAnswer == null) targetAnswer = answer;
    return answer;
  });
  if (targetAnswer == null || numbers.size === 0) return null;
  return {
    clozeNumber,
    answer: targetAnswer,
    filledText,
    clozeNumbers: [...numbers].sort((left, right) => left - right),
  };
}

export function extractQualifiers(text: string): { qualifiers: ClinicalClaimQualifiers; conflicts: string[] } {
  const normalized = stripNonClinicalMarkup(text).toLowerCase();
  const qualifiers: ClinicalClaimQualifiers = {};
  const conflicts: string[] = [];
  const hasLeft = /\bleft\b/.test(normalized);
  const hasRight = /\bright\b/.test(normalized);
  const hasBilateral = /\bbilateral\b/.test(normalized);
  if (hasLeft && hasRight && !hasBilateral) conflicts.push("laterality_conflict");
  else if (hasBilateral) qualifiers.laterality = "bilateral";
  else if (hasLeft) qualifiers.laterality = "left";
  else if (hasRight) qualifiers.laterality = "right";
  if (/\b(pediatric|child|children)\b/.test(normalized)) qualifiers.age_group = "pediatric";
  else if (/\badult\b/.test(normalized)) qualifiers.age_group = "adult";
  if (/\brevision\b/.test(normalized)) qualifiers.setting = "revision";
  else if (/\bpostoperative\b|\bpost-op\b/.test(normalized)) qualifiers.setting = "postoperative";
  else if (/\bprimary\b/.test(normalized)) qualifiers.setting = "primary";
  return { qualifiers, conflicts };
}

function compactText(value: string, max: number): string {
  const cleaned = stripNonClinicalMarkup(value).replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  return cleaned.slice(0, max).trim();
}

function finishSentence(value: string): string {
  const compact = compactText(value, 500);
  if (!compact) return compact;
  return /[.!?]$/.test(compact) ? compact : `${compact}.`;
}

function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function toDeclarativeClaimText(filled: string, answer: string): string {
  const text = compactText(filled, 500);
  const object = compactText(answer, 200);
  if (!text) return object;
  const split = text.match(/^(.*?)\?\s*(.*)$/);
  if (!split) return finishSentence(text);
  const stem = compactText(split[1], 500);
  const after = compactText(split[2] || object, 200);
  let match = stem.match(/^what is (.+)$/i);
  if (match) return finishSentence(`The ${match[1]} is ${after}`.replace(/^The the /i, "The "));
  match = stem.match(/^what makes (.+)$/i);
  if (match) return finishSentence(`${capitalize(match[1])} shows ${after}`);
  match = stem.match(/^what view of (.+) evaluates (.+)$/i);
  if (match) return finishSentence(`The ${after} view of ${match[1]} evaluates ${match[2]}`);
  match = stem.match(/^what position should (.+) be placed in to (.+)$/i);
  if (match) return finishSentence(`${capitalize(match[1])} should be placed in ${after} to ${match[2]}`);
  match = stem.match(/^what (?:additional )?(?:two specific )?(?:series of )?(radiographs?|x-rays?|views?) (.+)$/i);
  if (match) {
    const rest = match[2].replace(/^(should|must) be obtained\s+/i, "");
    const modal = /\bmust\b/i.test(match[2]) ? "must" : "should";
    return finishSentence(`${capitalize(after)} ${modal} be obtained ${rest}`);
  }
  match = stem.match(/^(.+?) of what (.+)$/i);
  if (match) return finishSentence(`${match[1]} of ${after} ${match[2]}`);
  match = stem.match(/^(.+\bof )\s*what condition$/i);
  if (match) return finishSentence(`${match[1]}${after}`);
  if (/\b(what|which)\b/i.test(stem)) {
    return finishSentence(stem.replace(/\b(?:what|which)(?: condition)?\b/i, after));
  }
  return finishSentence(`${stem}: ${after}`);
}

export function inferClaimType(input: {
  filledText: string;
  entityType: string | null;
}): { claimType: ClinicalClaimType; predicate: string } {
  const text = stripNonClinicalMarkup(input.filledText).toLowerCase();
  if (/\bcontraindicat|\bnot indicated\b|\bavoid\b/.test(text)) {
    return { claimType: "contraindication", predicate: "contraindication" };
  }
  if (/\bcomplicat|\bat risk\b|\brisk of\b/.test(text)) {
    return { claimType: "complication", predicate: "complication_of" };
  }
  if (/\b(radiograph|x-ray|xray|imaging|mri|ct scan|ultrasound|broden|judet|skyline)\b/.test(text) || /\bviews?\b/.test(text)) {
    return { claimType: "imaging_point", predicate: "imaging_finding" };
  }
  if (/\bpreferred\b|\btreatment of choice\b|\bindicated\b/.test(text)) {
    return {
      claimType: "treatment_indication",
      predicate: /\bpreferred\b|\btreatment of choice\b/.test(text) ? "preferred_treatment" : "indication",
    };
  }
  if (input.entityType === "complication") return { claimType: "complication", predicate: "complication_of" };
  if (input.entityType === "anatomy_structure") return { claimType: "anatomy_pearl", predicate: "teaches_fact" };
  if (input.entityType === "imaging_finding" || input.entityType === "diagnostic_test") {
    return { claimType: "imaging_point", predicate: "imaging_finding" };
  }
  if (
    input.entityType === "procedure"
    || input.entityType === "fixation_method"
    || input.entityType === "treatment_principle"
  ) {
    return { claimType: "treatment_indication", predicate: "indication" };
  }
  return { claimType: "fact", predicate: "teaches_fact" };
}

export function pickPrimaryEntity(
  semantic: SemanticCardResult,
  clozeAnswer: string,
  filledText: string,
): { resolution: SemanticResolution | null; competing: boolean; multiple: boolean } {
  const candidates = semantic.resolutions.filter((row) => row.canonicalEntityId && (
    row.disposition === "selected" || row.disposition === "deferred"
  ));
  const uniqueIds = new Set(candidates.map((row) => row.canonicalEntityId));
  const competing = uniqueIds.size > 1 && candidates.some((row) => row.reasonCodes.includes("alias_ambiguity"));
  const multiple = uniqueIds.size > 1;
  if (candidates.length === 0) return { resolution: null, competing: false, multiple: false };
  const answer = normalizeClinicalText(clozeAnswer);
  const filled = normalizeClinicalText(filledText);
  const byLength = (left: SemanticResolution, right: SemanticResolution) => (
    (right.normalizedConceptLabel?.length ?? 0) - (left.normalizedConceptLabel?.length ?? 0)
  );
  const inAnswer = candidates.filter((row) => {
    const label = normalizeClinicalText(row.normalizedConceptLabel);
    return label && (answer.includes(label) || label.includes(answer));
  });
  if (inAnswer.length === 1) return { resolution: inAnswer[0], competing: false, multiple };
  if (inAnswer.length > 1) return { resolution: [...inAnswer].sort(byLength)[0], competing: false, multiple };
  const inFilled = candidates.filter((row) => {
    const label = normalizeClinicalText(row.normalizedConceptLabel);
    return label && filled.includes(label);
  });
  if (inFilled.length === 1) return { resolution: inFilled[0], competing: false, multiple };
  if (inFilled.length > 1 && competing) return { resolution: null, competing: true, multiple };
  if (inFilled.length > 1) return { resolution: [...inFilled].sort(byLength)[0], competing: false, multiple };
  if (competing) return { resolution: null, competing: true, multiple };
  return { resolution: [...candidates].sort(byLength)[0], competing: false, multiple };
}

const PREFER_PREDICATES = new Set(["preferred_treatment", "preferred_reconstruction", "indication"]);
const CONTRA_PREDICATES = new Set(["contraindication"]);

export function opposingPolarity(left: string, right: string): boolean {
  return (PREFER_PREDICATES.has(left) && CONTRA_PREDICATES.has(right))
    || (CONTRA_PREDICATES.has(left) && PREFER_PREDICATES.has(right));
}

export function ontologyEntityType(claimType: ClinicalClaimType): string {
  if (claimType === "imaging_point") return "imaging_finding";
  if (claimType === "treatment_indication" || claimType === "contraindication") return "procedure";
  if (claimType === "complication") return "complication";
  if (claimType === "anatomy_pearl") return "anatomy_structure";
  if (claimType === "diagnostic_interpretation") return "diagnostic_test";
  return "condition";
}

/** Resolve a small set of unambiguous label-level type signals before the
 * proposed entity receives its deterministic ID. These are taxonomy terms,
 * not context-dependent clinical assertions. */
export function refineOntologyEntityType(defaultType: string, normalizedLabel: string): string {
  if (/\bnerve$/.test(normalizedLabel)) return "anatomy_structure";
  if (normalizedLabel === "tonnis") return "classification_system";
  if (normalizedLabel === "infection") return "condition";
  return defaultType;
}

const UNICODE_QUOTE_RE = /[‘’‚‛‹›“”„‟]/g;
const UNICODE_DASH_RE = /[‐‑‒–—―]/g;
const HINT_PARENTHETICAL_RE = /\s*\((?:aka|also known as|abbr\.?|abbrev\.?|abbreviation|hint|mnemonic)\b[^)]*\)\s*$/i;
const SURROUNDING_PUNCT_RE = /^[\s"'“”‘’`~*_:;,.\-–—()[\]{}]+|[\s"'“”‘’`~*_:;,.\-–—()[\]{}]+$/g;

export function normalizeProposedLabel(raw: string): {
  preferredLabel: string;
  normalizedLabel: string;
  transformed: boolean;
} {
  let text = stripNonClinicalMarkup(raw).replace(/&gt;/gi, ">").replace(/&lt;/gi, "<");
  let transformed = false;
  const track = (next: string): void => {
    if (next !== text) transformed = true;
    text = next;
  };
  track(text.replace(UNICODE_QUOTE_RE, "'").replace(UNICODE_DASH_RE, "-"));
  track(text.replace(HINT_PARENTHETICAL_RE, ""));
  track(text.replace(SURROUNDING_PUNCT_RE, ""));
  track(text.replace(/\s+/g, " ").trim());
  // No stemming or plural folding: the shared normalizeClinicalText has no
  // singular/plural convention, so folding here could collapse clinically
  // distinct concepts that merely look similar.
  return { preferredLabel: text, normalizedLabel: normalizeClinicalText(text), transformed };
}

export type EntityLikenessReason =
  | "placeholder_like"
  | "numeric_or_ordinal_fragment"
  | "generic_term_insufficient_context"
  | "response_fragment"
  | "measurement_or_location_fragment"
  | "demographic_fragment"
  | "directional_fragment"
  | "clause_like_answer"
  | "malformed_label"
  | "list_fragment";

export type SpecificityReason = "context_insufficient_for_specific_entity";

/** Labels with more than this many tokens read as prose, not entity names. */
const ENTITY_LIKE_MAX_WORDS = 6 as const;

const PLACEHOLDER_STEMS = new Set([
  "ext", "field", "cloze", "answer", "blank", "image", "figure", "table",
  "fig", "ref", "note", "text", "item",
]);

const ORDINAL_FRAGMENT_TOKENS = new Set(["and", "or", "of", "the", "a", "&", "+", "-", "/"]);

const GENERIC_VERBS = new Set([
  "inhibit", "inhibits", "inhibited", "inhibiting",
  "increase", "increases", "increased", "increasing",
  "decrease", "decreases", "decreased", "decreasing",
  "prevent", "prevents", "prevented", "preventing",
  "reduce", "reduces", "reduced", "reducing",
  "cause", "causes", "caused", "causing",
  "produce", "produces", "produced", "producing",
  "form", "forms", "formed", "forming",
  "occur", "occurs", "occurred", "occurring",
  "treat", "treats", "treated", "treating",
  "avoid", "avoids", "avoided", "avoiding",
]);

const GENERIC_STANDALONE_TERMS = new Set([
  "flexion", "extension", "reconstruction", "motion", "movement",
]);

// These are grammatical answer fragments rather than names of concepts. This
// is deliberately a small, domain-neutral set: it catches response words
// without trying to maintain a hidden medical vocabulary.
const RESPONSE_FRAGMENTS = new Set([
  "no difference", "not necessarily", "yes", "no", "worse", "better",
  "same", "none", "above", "below", "higher", "dark",
]);
const DIRECTIONAL_FRAGMENTS = new Set([
  "anterior", "posterior", "medial", "lateral", "superior", "inferior",
  "proximal", "distal", "axial", "flexed", "extended",
]);
const DEMOGRAPHIC_WORDS = new Set([
  "boy", "boys", "girl", "girls", "male", "males", "female", "females",
  "man", "men", "woman", "women", "patient", "patients",
]);
const MEASUREMENT_OR_LOCATION_FRAGMENT_RE = /^(?:[<>≤≥]?[\d.,]+(?:\s*[-–]\s*[\d.,]+)?\s*(?:cm|mm|m|kg|lb|lbs|°|degrees?|years?|months?|weeks?|days?)?(?:\s+(?:proximal|distal|medial|lateral|anterior|posterior|superior|inferior))?)$/i;

const CLAUSE_CONJUNCTIONS = new Set(["and", "or", "nor", "but", "yet", "so", "plus"]);
const LEADING_ARTICLES = new Set(["the", "a", "an"]);

/**
 * Deterministic entity-likeness gate between the normalized cloze answer and
 * proposed-entity generation. A cloze answer being text is not enough — it
 * must look like a real ontology concept. General string/grammatical
 * heuristics only; no per-answer special cases and no medical word lists.
 * Failing candidates go to manual review, never to proposed entities.
 */
export function assessEntityLikeness(input: {
  preferredLabel: string;
  normalizedLabel: string;
}): { entityLike: boolean; reasons: EntityLikenessReason[] } {
  const reasons: EntityLikenessReason[] = [];
  const push = (reason: EntityLikenessReason): void => {
    if (!reasons.includes(reason)) reasons.push(reason);
  };
  const normalized = input.normalizedLabel.trim();
  const preferred = input.preferredLabel.trim();
  const tokens = normalized.split(" ").filter(Boolean);

  // Placeholder / template-like values: EXT1, FIELD2, "table 2".
  if (tokens.length === 1) {
    const stem = tokens[0]!.replace(/\d+[a-z]?$/, "");
    if (
      PLACEHOLDER_STEMS.has(stem)
      && /^(?:ext|field|cloze|answer|blank|image|figure|table|fig|ref|note|text|item)\d+[a-z]?$/.test(tokens[0]!)
    ) {
      push("placeholder_like");
    }
  } else if (
    tokens.length === 2
    && PLACEHOLDER_STEMS.has(tokens[0]!)
    && /^\d+[a-z]?$/.test(tokens[1]!)
  ) {
    push("placeholder_like");
  }

  // Bare numbers / ordinal fragments: "6", "2nd", "4th and 5th".
  if (/^[+\-]?[\d.,/ ]+$/.test(normalized) && /\d/.test(normalized)) {
    push("numeric_or_ordinal_fragment");
  } else if (
    tokens.length > 0
    && tokens.every((token) => /^\d+(st|nd|rd|th)$/.test(token) || ORDINAL_FRAGMENT_TOKENS.has(token))
    && tokens.some((token) => /^\d+(st|nd|rd|th)$/.test(token))
  ) {
    push("numeric_or_ordinal_fragment");
  }

  // Generic verbs and overly generic standalone terms, single word only so
  // multi-word concepts ("cup-cage reconstruction") always pass this rule.
  if (tokens.length === 1 && (GENERIC_VERBS.has(tokens[0]!) || GENERIC_STANDALONE_TERMS.has(tokens[0]!))) {
    push("generic_term_insufficient_context");
  }

  if (RESPONSE_FRAGMENTS.has(normalized)) push("response_fragment");
  if (tokens.length === 1 && DIRECTIONAL_FRAGMENTS.has(tokens[0]!)) push("directional_fragment");
  if (tokens.length > 0 && tokens.every((token) => DEMOGRAPHIC_WORDS.has(token))) push("demographic_fragment");
  if (MEASUREMENT_OR_LOCATION_FRAGMENT_RE.test(normalized)) push("measurement_or_location_fragment");

  // Sentence / clause-like answers.
  if (tokens.length > ENTITY_LIKE_MAX_WORDS) push("clause_like_answer");
  if (tokens.filter((token) => CLAUSE_CONJUNCTIONS.has(token)).length >= 2) push("clause_like_answer");
  if (tokens.length >= 4 && LEADING_ARTICLES.has(tokens[0]!)) push("clause_like_answer");
  if (tokens.length >= 4 && /^[a-z]{5,}ly$/.test(tokens[0]!)) push("clause_like_answer");
  if (tokens.length >= 3 && tokens.some((token) => GENERIC_VERBS.has(token) || ["is", "are", "was", "were"].includes(token))) {
    push("clause_like_answer");
  }

  // Malformed structure: unbalanced delimiters, cloze artifacts, truncation.
  const openParens = (preferred.match(/\(/g) ?? []).length;
  const closeParens = (preferred.match(/\)/g) ?? []).length;
  const openBrackets = (preferred.match(/\[/g) ?? []).length;
  const closeBrackets = (preferred.match(/\]/g) ?? []).length;
  if (openParens !== closeParens || openBrackets !== closeBrackets) push("malformed_label");
  if (/\{\{|\}\}|::/.test(preferred)) push("malformed_label");
  if (/(\u2026|\.\.\.|-\s*|\(\s*|\[\s*)$/.test(preferred)) push("malformed_label");

  // List fragments: enumerations name several concepts, not one entity.
  if (preferred.includes(",")) push("list_fragment");
  if (/--/.test(preferred)) push("list_fragment");
  if (preferred.split("/").length >= 3) push("list_fragment");

  return { entityLike: reasons.length === 0, reasons };
}

/**
 * Anchors need this many contiguous content words before they count as
 * evidence that the card teaches something compositionally richer than a
 * short, plain candidate label. Calibrated so generic predicate boilerplate
 * ("requires careful evaluation") does not fire while genuinely specific
 * noun phrases ("primary malignant bone tumors") do; misses pass through
 * as "uncertain" rather than blocking aggressively.
 */
const CONTEXT_SPECIFICITY_MIN_ANCHOR_WORDS = 4 as const;

/** Closed-class English stopwords for anchor-span segmentation. Not medical. */
const CONTEXT_STOPWORDS = new Set([
  "a", "an", "the", "of", "to", "in", "on", "for", "with", "and", "or",
  "nor", "but", "are", "is", "was", "were", "be", "been", "being",
  "should", "would", "could", "can", "will", "shall", "may", "might",
  "must", "not", "no", "most", "which", "what", "when", "where", "how",
  "why", "that", "this", "these", "those", "it", "its", "as", "at", "by",
  "from", "do", "does", "did", "done", "have", "has", "had", "having",
  "you", "your", "he", "she", "we", "they", "them", "his", "her",
  "their", "our", "than", "then", "so", "such", "also", "very", "more",
  "between", "through", "during", "following", "without", "within",
  "into", "over", "under", "after", "before", "about", "against",
  "among", "along", "across", "behind", "beyond", "plus", "except",
  "whether", "while", "though", "although", "since", "until", "unless",
  "per",
]);

/**
 * Contextual-specificity check: runs after entity-likeness passes, before a
 * proposed entity is auto-approved. Flags short, plain compositional labels
 * whose meaning depends on the question — e.g. "surgical margins" on a card
 * specifically about tumor margins — without inventing a more specific label.
 *
 * Deterministic and conservative by design:
 * - atomic (single-token) labels and labels with intrinsic specificity
 *   markers (digits, slashes, hyphens) are inherently specific: true.
 * - a multi-word plain label is blocked (false) only when the card prose
 *   contains a clearly more specific nearby noun phrase: a run of at least
 *   four content words sharing no token with the candidate.
 * - otherwise "uncertain": no confident signal, leave the candidate alone.
 */
export function assessContextualSpecificity(input: {
  preferredLabel: string;
  normalizedLabel: string;
  cardContextText: string;
}): {
  contextuallySpecific: true | false | "uncertain";
  specificityReasons: SpecificityReason[];
  specificityAnchor: string | null;
} {
  const tokens = input.normalizedLabel.trim().split(" ").filter(Boolean);
  if (tokens.length === 0) return { contextuallySpecific: "uncertain", specificityReasons: [], specificityAnchor: null };
  const content = tokens.filter((token) => !CONTEXT_STOPWORDS.has(token));
  // Atomic labels cannot drop compositional context; markers anchor specificity.
  if (content.length <= 1) return { contextuallySpecific: true, specificityReasons: [], specificityAnchor: null };
  if (tokens.some((token) => /[0-9/+-]/.test(token))) {
    return { contextuallySpecific: true, specificityReasons: [], specificityAnchor: null };
  }
  const candidateSet = new Set(content);
  const contextTokens = normalizeClinicalText(input.cardContextText).split(" ").filter(Boolean);
  let longestAnchor: string[] = [];
  let current: string[] = [];
  const flush = (): void => {
    if (
      current.length >= CONTEXT_SPECIFICITY_MIN_ANCHOR_WORDS
      && current.every((token) => !candidateSet.has(token))
      && current.length > longestAnchor.length
    ) {
      longestAnchor = [...current];
    }
    current = [];
  };
  for (const token of contextTokens) {
    if (CONTEXT_STOPWORDS.has(token)) flush();
    else current.push(token);
  }
  flush();
  if (longestAnchor.length === 0) {
    return { contextuallySpecific: "uncertain", specificityReasons: [], specificityAnchor: null };
  }
  return {
    contextuallySpecific: false,
    specificityReasons: ["context_insufficient_for_specific_entity"],
    specificityAnchor: longestAnchor.slice(0, 20).join(" "),
  };
}

/**
 * Short forms that are legitimate medical/technical entities on their own.
 * `ambiguous` entries (classic collisions such as PE / RA) REQUIRE supporting
 * context — a canonical alias or an explicit expansion on the card. Anything
 * not listed here stays unresolved rather than guessed.
 */
export const RECOGNIZED_SHORT_FORMS: Readonly<Record<string, { ambiguous: boolean }>> = {
  acl: { ambiguous: false },
  pcl: { ambiguous: false },
  mcl: { ambiguous: false },
  lcl: { ambiguous: false },
  dvt: { ambiguous: false },
  oa: { ambiguous: false },
  hiv: { ambiguous: false },
  mri: { ambiguous: false },
  ct: { ambiguous: false },
  xr: { ambiguous: false },
  orif: { ambiguous: false },
  tha: { ambiguous: false },
  tka: { ambiguous: false },
  rom: { ambiguous: false },
  nsaid: { ambiguous: false },
  vte: { ambiguous: false },
  pe: { ambiguous: true },
  ra: { ambiguous: true },
};

const RETIRED_LIFECYCLE = new Set(["deprecated", "replaced", "merged", "split"]);

function activeCanonicalEntities(entities: EntityIndexRow[]): EntityIndexRow[] {
  return entities.filter((entity) => entity.active && !RETIRED_LIFECYCLE.has(entity.lifecycleStatus));
}

export function lookupCanonicalShortForm(
  shortNormalized: string,
  entities: EntityIndexRow[],
): EntityIndexRow | null {
  const target = shortNormalized.toLowerCase();
  return activeCanonicalEntities(entities).find((entity) => (
    [entity.normalizedLabel, ...entity.aliases, ...entity.sourceAliases]
      .map(normalizeClinicalText)
      .includes(target)
  )) ?? null;
}

export function lookupCanonicalLabel(
  label: string,
  entities: EntityIndexRow[],
): EntityIndexRow | null {
  const target = normalizeClinicalText(label);
  if (!target) return null;
  return activeCanonicalEntities(entities).find((entity) => (
    [entity.normalizedLabel, ...entity.aliases, ...entity.sourceAliases]
      .map(normalizeClinicalText)
      .includes(target)
  )) ?? null;
}

/**
 * Generates conservative lexical variants for an answer such as
 * "Flexor hallucis longus (FHL)".  The full label, the outer label, and each
 * parenthetical value are all tried against the existing alias table.  This
 * deliberately does not expand acronyms or rewrite clinical wording.
 */
export function clozeAnswerMatchVariants(answer: string): string[] {
  const values = [answer];
  const inners = [...answer.matchAll(/\(([^()]*)\)/g)].map((match) => match[1] ?? "");
  values.push(answer.replace(/\s*\([^()]*\)/g, " "));
  values.push(...inners);
  const seen = new Set<string>();
  return values
    .map((value) => normalizeClinicalText(value))
    .filter((value) => value.length > 0 && !seen.has(value) && (seen.add(value), true));
}

export function resolveCanonicalClozeAnswer(answer: string, entities: EntityIndexRow[]): {
  entity: EntityIndexRow | null;
  ambiguous: boolean;
  attempts: CanonicalMatchAttempt[];
} {
  const attempts: CanonicalMatchAttempt[] = [];
  const matches = new Map<string, EntityIndexRow>();
  for (const label of clozeAnswerMatchVariants(answer)) {
    const matching = activeCanonicalEntities(entities).filter((entity) => (
      [entity.normalizedLabel, ...entity.aliases, ...entity.sourceAliases]
        .map(normalizeClinicalText)
        .includes(label)
    ));
    for (const entity of matching) matches.set(entity.id, entity);
    const uniqueMatch = matching.length === 1 ? matching[0]! : null;
    attempts.push({
      label,
      matchType: uniqueMatch && normalizeClinicalText(uniqueMatch.normalizedLabel) === label
        ? "preferred_label"
        : "alias",
      matchedEntityId: uniqueMatch?.id ?? null,
    });
  }
  if (matches.size !== 1) return { entity: null, ambiguous: matches.size > 1, attempts };
  return { entity: [...matches.values()][0]!, ambiguous: false, attempts };
}

/** Finds an explicit "Expansion (ACR)" or "ACR (Expansion)" on the card. Never invents one. */
export function findShortAnswerExpansion(cardContextText: string, shortUpper: string): string | null {
  const escaped = shortUpper.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`\\b([A-Za-z][A-Za-z\\- ]{2,60}?)\\s*\\(\\s*${escaped}\\s*\\)`),
    new RegExp(`\\b${escaped}\\s*\\(\\s*([A-Za-z][A-Za-z\\- ]{2,60}?)\\s*\\)`),
  ];
  for (const pattern of patterns) {
    const match = cardContextText.match(pattern);
    if (match && normalizeClinicalText(match[1]).length >= PROPOSED_ENTITY_MIN_NORMALIZED_LENGTH) {
      return compactText(match[1], 80);
    }
  }
  return null;
}

export type ShortAnswerResolution =
  | {
    kind: "canonical";
    canonicalEntityId: string;
    entityType: string;
    confidence: number;
    attempts: CanonicalMatchAttempt[];
  }
  | {
    kind: "proposed";
    preferredLabel: string;
    normalizedLabel: string;
    derivation: "short_acronym_expansion" | "short_acronym_recognized";
    confidence: number;
    attempts: CanonicalMatchAttempt[];
  }
  | { kind: "unresolved"; reason: typeof SHORT_LABEL_INSUFFICIENT_CONTEXT; attempts: CanonicalMatchAttempt[] };

export function resolveShortClozeAnswer(input: {
  normalizedAnswer: string;
  cardContextText: string;
  entities: EntityIndexRow[];
}): ShortAnswerResolution {
  const shortKey = input.normalizedAnswer.toLowerCase();
  const attempts: CanonicalMatchAttempt[] = [
    { label: input.normalizedAnswer, matchType: "normalized_cloze", matchedEntityId: null },
  ];
  // Priority 1: existing ontology aliases.
  const canonical = lookupCanonicalShortForm(shortKey, input.entities);
  attempts.push({ label: input.normalizedAnswer, matchType: "alias", matchedEntityId: canonical?.id ?? null });
  if (canonical) {
    return { kind: "canonical", canonicalEntityId: canonical.id, entityType: canonical.entityType, confidence: 1, attempts };
  }
  // Priorities 2-4: explicit expansion on the card (stem, extra fields, topic tags).
  const expansion = findShortAnswerExpansion(input.cardContextText, shortKey.toUpperCase());
  if (expansion) {
    const expansionCanonical = lookupCanonicalLabel(expansion, input.entities);
    if (expansionCanonical) {
      attempts.push({ label: normalizeClinicalText(expansion), matchType: "preferred_label", matchedEntityId: expansionCanonical.id });
      return {
        kind: "canonical",
        canonicalEntityId: expansionCanonical.id,
        entityType: expansionCanonical.entityType,
        confidence: 1,
        attempts,
      };
    }
    return {
      kind: "proposed",
      preferredLabel: expansion,
      normalizedLabel: normalizeClinicalText(expansion),
      derivation: "short_acronym_expansion",
      confidence: 0.6,
      attempts,
    };
  }
  // Priority 5: the short answer itself, only when recognized and unambiguous.
  const registry = RECOGNIZED_SHORT_FORMS[shortKey];
  if (!registry || registry.ambiguous) {
    return { kind: "unresolved", reason: SHORT_LABEL_INSUFFICIENT_CONTEXT, attempts };
  }
  return {
    kind: "proposed",
    preferredLabel: shortKey.toUpperCase(),
    normalizedLabel: shortKey,
    derivation: "short_acronym_recognized",
    confidence: 0.6,
    attempts,
  };
}

export function buildProposedEntity(input: {
  preferredLabel: string;
  normalizedLabel: string;
  entityType: string;
  rawClozeText: string;
  cardId: string;
  derivation: ProposedEntityDerivation;
  confidence: number;
  canonicalMatchAttempts: CanonicalMatchAttempt[];
  deckId?: string;
  now?: () => string;
}): ProposedOntologyEntity {
  // Deterministic: equivalent type + normalized label always yields the same ID.
  const entityId = deterministicUuid(`ontology-fill|${input.entityType}|${input.normalizedLabel}`);
  return {
    entityId,
    preferredLabel: input.preferredLabel,
    normalizedLabel: input.normalizedLabel,
    entityType: input.entityType,
    source: "card_cloze",
    filledFromCardId: input.cardId,
    sourceCardIds: [input.cardId],
    ...(input.deckId ? { sourceDeckId: input.deckId } : {}),
    rawClozeText: compactText(input.rawClozeText, 200),
    generatedAt: (input.now ?? (() => new Date().toISOString()))(),
    resolutionReason: "no_canonical_match",
    derivation: input.derivation,
    confidence: input.confidence,
    canonicalMatchAttempts: input.canonicalMatchAttempts.slice(0, 10),
    status: "proposed",
    contextuallySpecific: "uncertain",
    specificityReasons: [],
  };
}

export function proposeOntologyEntity(input: {
  clozeAnswer: string;
  missingLabels: string[];
  claimType: ClinicalClaimType;
  cardId: string;
  deckId?: string;
  now?: () => string;
}): ProposedOntologyEntity | null {
  const fromCloze = normalizeProposedLabel(input.clozeAnswer);
  let preferredLabel = fromCloze.preferredLabel;
  let normalizedLabel = fromCloze.normalizedLabel;
  let derivation: ProposedEntityDerivation = fromCloze.transformed
    ? "normalized_cloze_answer"
    : "cloze_answer_direct";
  let confidence = fromCloze.transformed ? 0.8 : 1;
  if (normalizedLabel.length < PROPOSED_ENTITY_MIN_NORMALIZED_LENGTH) {
    const fallback = input.missingLabels
      .map((label) => normalizeProposedLabel(label))
      .find((label) => label.normalizedLabel.length >= PROPOSED_ENTITY_MIN_NORMALIZED_LENGTH);
    if (!fallback) return null;
    preferredLabel = fallback.preferredLabel;
    normalizedLabel = fallback.normalizedLabel;
    derivation = "normalized_cloze_answer";
    confidence = 0.8;
  }
  const entityType = refineOntologyEntityType(ontologyEntityType(input.claimType), normalizedLabel);
  const seen = new Set<string>();
  const canonicalMatchAttempts: CanonicalMatchAttempt[] = [
    { label: normalizedLabel, matchType: "normalized_cloze", matchedEntityId: null },
    ...input.missingLabels
      .map((label) => normalizeClinicalText(label))
      .filter((label) => label && !seen.has(label) && (seen.add(label), true))
      .slice(0, 9)
      .map((label) => ({ label, matchType: "normalized_cloze" as const, matchedEntityId: null })),
  ];
  return buildProposedEntity({
    preferredLabel,
    normalizedLabel,
    entityType,
    rawClozeText: input.clozeAnswer,
    cardId: input.cardId,
    derivation,
    confidence,
    canonicalMatchAttempts,
    deckId: input.deckId,
    now: input.now,
  });
}

function primaryCriticsSupport(result: SemanticCardResult, primaryEntityId: string): {
  supported: boolean;
  reasonCodes: string[];
  reviews: SemanticCritic[];
} {
  const reviews = result.critics.filter(
    (critic) => critic.canonicalEntityId === primaryEntityId || critic.canonicalEntityId == null,
  );
  const opposed = reviews.filter((critic) => critic.decision !== "support");
  return {
    supported: reviews.length > 0 && opposed.length === 0,
    reasonCodes: opposed.flatMap((critic) => critic.reasonCodes),
    reviews,
  };
}

function cardEligible(card: CardClaimFactoryCard): string | null {
  if (!card.active || !card.currentVersion) return "inactive_or_stale";
  if (card.inclusionStatus === "excluded" || card.inclusionStatus === "withdrawn") return "inactive_or_stale";
  return null;
}

export function autoApprovePolicy(input: {
  criticsSupport: boolean;
  uniqueEntity: boolean;
  atomic: boolean;
  currentAndActive: boolean;
  contradiction: boolean;
  duplicateSibling: boolean;
  qualifierConflict: boolean;
  extracted: boolean;
}): { approved: boolean; queue: CardClaimFactoryQueue; reasonCodes: string[] } {
  if (!input.currentAndActive) return { approved: false, queue: "inactive_or_stale", reasonCodes: ["inactive_or_stale"] };
  if (!input.extracted) return { approved: false, queue: "extraction_failed", reasonCodes: ["cloze_not_extracted"] };
  if (input.qualifierConflict) return { approved: false, queue: "qualifier_conflict", reasonCodes: ["qualifier_conflict"] };
  if (!input.uniqueEntity) return { approved: false, queue: "competing_entities", reasonCodes: ["unique_entity_required"] };
  if (!input.atomic) return { approved: false, queue: "non_atomic", reasonCodes: ["non_atomic_card"] };
  if (!input.criticsSupport) return { approved: false, queue: "insufficient_content", reasonCodes: ["critic_not_unanimous"] };
  if (input.contradiction) return { approved: false, queue: "cross_card_contradiction", reasonCodes: ["cross_card_contradiction"] };
  if (input.duplicateSibling) return { approved: false, queue: "duplicate_sibling", reasonCodes: ["duplicate_sibling_cloze"] };
  return { approved: true, queue: "auto_approved", reasonCodes: ["machine_consensus"] };
}

export function runCardClaimFactory(input: {
  cards: CardClaimFactoryCard[];
  entities: EntityIndexRow[];
  existingClaims?: ExistingClaimRef[];
  deckId?: string;
  /** Injectable clock for deterministic dry runs. Defaults to wall-clock time. */
  now?: () => string;
}): CardClaimFactoryOutput {
  if (containsUnsafeMetadata(input.cards.map((card) => card.tags))) {
    throw new Error("unsafe_input_metadata");
  }
  const cards = [...input.cards].sort((left, right) => (
    left.noteGuid.localeCompare(right.noteGuid)
    || left.cardOrdinal - right.cardOrdinal
    || left.canonicalCardId.localeCompare(right.canonicalCardId)
  ));
  for (const card of cards) {
    validateEphemeralCard(card, {
      cardId: card.canonicalCardId,
      versionId: card.canonicalCardVersionId,
      contentHash: card.contentHash,
    });
    if (canonicalContentHash(card) !== card.contentHash) throw new Error(`content_hash_mismatch:${card.canonicalCardId}`);
  }

  const semanticByCard = new Map(cards.map((card) => [card.canonicalCardId, runSemanticCard(card, input.entities)]));
  const existingByHash = new Map((input.existingClaims ?? []).map((claim) => [claim.fingerprintHash, claim]));
  const claimByHash = new Map<string, ProposedFactoryClaim>();
  const entityById = new Map<string, ProposedOntologyEntity>();
  const links: CardClaimLinkV1[] = [];
  const assignments: CardClaimFactoryAssignment[] = [];
  const gaps: EducationalClaimGapV1[] = [];
  const machineReviews: CardClaimFactoryOutput["machineReviews"] = [];
  const approvedFingerprintsByNote = new Map<string, Set<string>>();
  let canonicalEntityMatches = 0;
  let proposedEntitiesCreated = 0;
  let proposedEntitiesReused = 0;
  let cardsAttachedToProposedEntities = 0;
  let shortLabelInsufficientContext = 0;
  let entityLikenessBlocked = 0;
  let contextSpecificityBlocked = 0;

  for (const card of cards) {
    const eligibility = cardEligible(card);
    const semantic = semanticByCard.get(card.canonicalCardId)!;
    const field = teachingField(card);
    const cloze = field ? extractTargetCloze(field.rawValue, card.cardOrdinal) : null;
    const filled = cloze?.filledText ?? field?.plainText ?? "";
    const objectText = compactText(cloze?.answer ?? "", 200);
    const claimText = cloze ? toDeclarativeClaimText(filled, cloze.answer) : compactText(filled, 500);
    const qualifierInfo = extractQualifiers(filled);
    const centrals = semantic.concepts.filter((concept) => concept.central);
    const picked = pickPrimaryEntity(semantic, cloze?.answer ?? "", filled);
    const negated = semantic.concepts.some((concept) => concept.negated || concept.distractor);
    const primary = picked.resolution;
    const criticGate = primary?.canonicalEntityId
      ? primaryCriticsSupport(semantic, primary.canonicalEntityId)
      : { supported: true, reasonCodes: ["unresolved_entity"], reviews: [] };
    machineReviews.push(...criticGate.reviews.map((review) => ({
      canonicalCardId: card.canonicalCardId,
      reviewerType: review.reviewerType,
      decision: review.decision,
      reasonCodes: review.reasonCodes,
    })));

    let queue: CardClaimFactoryQueue = "extraction_failed";
    let reasonCodes: string[] = [];
    let fingerprintHash: string | null = null;
    let ontologyFill: ProposedOntologyEntity | null = null;
    let canonicalShortFill: { canonicalEntityId: string; entityType: string } | null = null;
    let canonicalAnswerFill: { canonicalEntityId: string; entityType: string } | null = null;
    let canonicalAnswerAmbiguous = false;
    let shortUnresolved = false;
    let likenessBlocked: {
      preferredLabel: string;
      normalizedLabel: string;
      entityType: string;
      derivation: ProposedEntityDerivation;
      confidence: number;
      reasons: EntityLikenessReason[];
    } | null = null;
    let specificityBlocked: {
      preferredLabel: string;
      normalizedLabel: string;
      entityType: string;
      derivation: ProposedEntityDerivation;
      confidence: number;
      anchor: string;
    } | null = null;
    let gapAttempts: CanonicalMatchAttempt[] = [];
    let entityReuse: "new" | "reused" | null = null;
    let entityTargetType: EntityTargetType = "unresolved";
    if (eligibility) {
      queue = "inactive_or_stale";
      reasonCodes = [eligibility];
    } else if (!cloze || !objectText || !claimText) {
      queue = "extraction_failed";
      reasonCodes = ["cloze_not_extracted"];
    } else if (qualifierInfo.conflicts.length) {
      queue = "qualifier_conflict";
      reasonCodes = qualifierInfo.conflicts;
    } else if (negated) {
      queue = "negated_or_distractor";
      reasonCodes = ["negated_or_distractor"];
    } else if (picked.competing && !primary) {
      queue = "competing_entities";
      reasonCodes = ["alias_ambiguity"];
    } else if (semantic.qualityFindings.includes("potential_multiconcept_overload") || centrals.length > 2) {
      queue = "non_atomic";
      reasonCodes = semantic.qualityFindings.length ? semantic.qualityFindings : ["non_atomic_card"];
    } else {
      const inferred = inferClaimType({ filledText: filled, entityType: primary?.entityType ?? null });
      const missingLabels = semantic.resolutions
        .filter((row) => row.disposition === "missing_entity")
        .map((row) => row.normalizedConceptLabel)
        .filter(Boolean);
      // Ontology gap resolution: canonical first, then proposed generation, then
      // the short-answer path. The minimum-length rule is kept, not weakened.
      if (!primary?.canonicalEntityId) {
        const canonicalAnswer = resolveCanonicalClozeAnswer(cloze.answer, input.entities);
        gapAttempts = canonicalAnswer.attempts;
        if (canonicalAnswer.entity) {
          canonicalAnswerFill = {
            canonicalEntityId: canonicalAnswer.entity.id,
            entityType: canonicalAnswer.entity.entityType,
          };
        } else if (canonicalAnswer.ambiguous) {
          canonicalAnswerAmbiguous = true;
        } else {
          ontologyFill = proposeOntologyEntity({
            clozeAnswer: cloze.answer,
            missingLabels,
            claimType: inferred.claimType,
            cardId: card.canonicalCardId,
            deckId: input.deckId,
            now: input.now,
          });
          if (ontologyFill) {
            gapAttempts = [...gapAttempts, ...ontologyFill.canonicalMatchAttempts];
          }
        }
        if (!canonicalAnswerFill && !ontologyFill && !canonicalAnswer.ambiguous && normalizeClinicalText(cloze.answer).length < PROPOSED_ENTITY_MIN_NORMALIZED_LENGTH) {
          const shortContext = [
            filled,
            ...card.fields.map((entry) => entry.plainText ?? entry.rawValue),
            ...card.tags,
          ].join(" ");
          const short = resolveShortClozeAnswer({
            normalizedAnswer: normalizeClinicalText(cloze.answer),
            cardContextText: shortContext,
            entities: input.entities,
          });
          gapAttempts = short.attempts;
          if (short.kind === "canonical") {
            canonicalShortFill = { canonicalEntityId: short.canonicalEntityId, entityType: short.entityType };
          } else if (short.kind === "proposed") {
            ontologyFill = buildProposedEntity({
              preferredLabel: short.preferredLabel,
              normalizedLabel: short.normalizedLabel,
              entityType: refineOntologyEntityType(ontologyEntityType(inferred.claimType), short.normalizedLabel),
              rawClozeText: cloze.answer,
              cardId: card.canonicalCardId,
              derivation: short.derivation,
              confidence: short.confidence,
              canonicalMatchAttempts: short.attempts,
              deckId: input.deckId,
              now: input.now,
            });
            gapAttempts = ontologyFill.canonicalMatchAttempts;
          } else {
            shortUnresolved = true;
          }
        }
      }
      // Entity-likeness gate: a syntactically valid answer that does not look
      // like a real ontology concept never becomes a proposed entity. The
      // card still produces its claim; only the entity target changes.
      if (ontologyFill) {
        const likeness = assessEntityLikeness({
          preferredLabel: ontologyFill.preferredLabel,
          normalizedLabel: ontologyFill.normalizedLabel,
        });
        if (!likeness.entityLike) {
          likenessBlocked = {
            preferredLabel: ontologyFill.preferredLabel,
            normalizedLabel: ontologyFill.normalizedLabel,
            entityType: ontologyFill.entityType,
            derivation: ontologyFill.derivation,
            confidence: ontologyFill.confidence,
            reasons: likeness.reasons,
          };
          entityLikenessBlocked += 1;
          ontologyFill = null;
        }
      }
      // Contextual-specificity gate: runs after entity-likeness passes. A
      // label that is too generic for what the card actually teaches goes to
      // manual review with its claim kept and no teaches link. Never invents
      // a more specific label; uncertain cases are left alone.
      if (ontologyFill) {
        const specificityContext = [
          filled,
          ...card.fields.map((entry) => entry.plainText ?? entry.rawValue),
        ].join(" ");
        const specificity = assessContextualSpecificity({
          preferredLabel: ontologyFill.preferredLabel,
          normalizedLabel: ontologyFill.normalizedLabel,
          cardContextText: specificityContext,
        });
        ontologyFill.contextuallySpecific = specificity.contextuallySpecific;
        ontologyFill.specificityReasons = specificity.specificityReasons;
        if (specificity.contextuallySpecific === false) {
          specificityBlocked = {
            preferredLabel: ontologyFill.preferredLabel,
            normalizedLabel: ontologyFill.normalizedLabel,
            entityType: ontologyFill.entityType,
            derivation: ontologyFill.derivation,
            confidence: ontologyFill.confidence,
            anchor: specificity.specificityAnchor ?? "",
          };
          contextSpecificityBlocked += 1;
          ontologyFill = null;
        }
      }
      // Run-level dedup: equivalent type + normalized label reuses one entity.
      if (ontologyFill) {
        const previous = entityById.get(ontologyFill.entityId);
        if (previous) {
          if (!previous.sourceCardIds.includes(card.canonicalCardId)) {
            previous.sourceCardIds.push(card.canonicalCardId);
          }
          ontologyFill = previous;
          entityReuse = "reused";
          proposedEntitiesReused += 1;
        } else {
          entityById.set(ontologyFill.entityId, ontologyFill);
          entityReuse = "new";
          proposedEntitiesCreated += 1;
        }
        cardsAttachedToProposedEntities += 1;
      }
      entityTargetType = primary?.canonicalEntityId || canonicalAnswerFill || canonicalShortFill
        ? "canonical"
        : ontologyFill
          ? "proposed"
          : "unresolved";
      if (entityTargetType === "canonical") canonicalEntityMatches += 1;
      if (shortUnresolved) shortLabelInsufficientContext += 1;
      const entityId = primary?.canonicalEntityId
        ?? canonicalAnswerFill?.canonicalEntityId
        ?? canonicalShortFill?.canonicalEntityId
        ?? ontologyFill?.entityId
        ?? UNRESOLVED_CLAIM_ENTITY_ID;
      const fingerprintInput = {
        claimType: inferred.claimType,
        primaryEntityId: entityId,
        predicate: inferred.predicate,
        objectText,
        qualifiers: qualifierInfo.qualifiers,
      };
      fingerprintHash = clinicalClaimFingerprintHash(fingerprintInput);
      const polarityClash = [...claimByHash.values()].some((claim) => (
        claim.primaryEntityId === entityId
        && normalizeClinicalText(claim.objectText) === normalizeClinicalText(objectText)
        && opposingPolarity(claim.predicate, inferred.predicate)
      ));
      const siblingKeys = approvedFingerprintsByNote.get(card.noteGuid) ?? new Set<string>();
      const resolved = Boolean(primary?.canonicalEntityId || canonicalAnswerFill || canonicalShortFill || ontologyFill);
      const policy = autoApprovePolicy({
        criticsSupport: primary?.canonicalEntityId ? criticGate.supported : true,
        uniqueEntity: resolved,
        atomic: centrals.length <= 2 && !semantic.qualityFindings.includes("potential_multiconcept_overload"),
        currentAndActive: true,
        contradiction: polarityClash,
        duplicateSibling: siblingKeys.has(fingerprintHash),
        qualifierConflict: false,
        extracted: true,
      });
      const existing = existingByHash.get(fingerprintHash) ?? claimByHash.get(fingerprintHash);
      const claimId = existing?.claimId ?? deterministicUuid(`clinical-claim|${fingerprintHash}`);
      const currentVersionId = existing?.currentVersionId
        ?? deterministicUuid(`clinical-claim-version|${fingerprintHash}|${CARD_CLAIM_FACTORY_ALGORITHM}`);
      const evidenceHash = checksum({
        cardVersionId: card.canonicalCardVersionId,
        fingerprintHash,
        locator: "cloze",
      });
      const proposed: ProposedFactoryClaim = {
        contractVersion: "snaportho-clinical-claim.v1",
        claimId,
        currentVersionId,
        fingerprintHash,
        claimText,
        claimType: inferred.claimType,
        predicate: inferred.predicate,
        objectText,
        qualifiers: qualifierInfo.qualifiers,
        primaryEntityId: entityId,
        approvalMethod: "machine_consensus",
        algorithmVersion: CARD_CLAIM_FACTORY_ALGORITHM,
        isActive: true,
        evidenceLocator: "cloze",
        evidenceHash,
        entityTargetType,
      };
      if (!isClinicalClaimRecordV1(proposed)) throw new Error(`unsafe_or_invalid_claim:${card.canonicalCardId}`);
      if (!claimByHash.has(fingerprintHash)) claimByHash.set(fingerprintHash, proposed);
      if (!resolved) {
        queue = "missing_entity";
        const unresolvedReasons = likenessBlocked
          ? [...likenessBlocked.reasons]
          : specificityBlocked
            ? ["context_insufficient_for_specific_entity"]
            : [
              canonicalAnswerAmbiguous
                ? "alias_ambiguity"
                : shortUnresolved
                  ? SHORT_LABEL_INSUFFICIENT_CONTEXT
                  : "unresolved_entity",
            ];
        reasonCodes = picked.multiple
          ? ["multiple_central_entities", ...unresolvedReasons]
          : unresolvedReasons;
      } else if (policy.approved) {
        // Never auto-approve off a low-confidence proposed entity, even if
        // generation ever yields one below the threshold.
        if (ontologyFill && ontologyFill.confidence < PROPOSED_ENTITY_AUTO_APPROVE_CONFIDENCE) {
          queue = "missing_entity";
          reasonCodes = ["low_confidence_proposed_entity"];
        } else {
          queue = "auto_approved";
          reasonCodes = [
            "machine_consensus",
            ...(ontologyFill ? [ONTOLOGY_GAP_FILLED_REASON] : []),
            ...(canonicalAnswerFill || canonicalShortFill ? ["canonical_alias_match"] : []),
            ...(picked.multiple ? ["primary_entity_picked"] : []),
          ];
          const link: CardClaimLinkV1 = {
            contractVersion: "snaportho-clinical-claim.v1",
            canonicalCardId: card.canonicalCardId,
            canonicalCardVersionId: card.canonicalCardVersionId,
            claimId,
            claimVersionId: currentVersionId,
            mappingRole: "teaches",
            confidence: Math.min(
              0.99,
              Math.max(0.9, criticGate.reviews.reduce((sum, review) => sum + review.confidence, 0) / Math.max(criticGate.reviews.length, 1)),
            ),
            approvalMethod: "machine_consensus",
            reviewStatus: "auto_approved",
            algorithmVersion: CARD_CLAIM_FACTORY_ALGORITHM,
            evidenceLocator: "cloze",
            evidenceHashes: [evidenceHash],
            reasonCodes: [...reasonCodes, "atomic_card"],
            metadata: {
              factoryImplementation: CARD_CLAIM_FACTORY_IMPLEMENTATION_VERSION,
              sourceCardId: card.canonicalCardId,
              claimId,
              entityId,
              entityTargetType,
              ...(ontologyFill
                ? {
                  approvalReason: ONTOLOGY_GAP_FILLED_APPROVAL_REASON,
                  proposedEntityId: ontologyFill.entityId,
                  proposedEntityConfidence: ontologyFill.confidence,
                }
                : {}),
            },
            isActive: true,
          };
          if (!isCardClaimLinkV1(link) || containsProtectedEducationalContent(link)) {
            throw new Error(`unsafe_or_invalid_link:${card.canonicalCardId}`);
          }
          links.push(link);
          siblingKeys.add(fingerprintHash);
          approvedFingerprintsByNote.set(card.noteGuid, siblingKeys);
        }
      } else {
        queue = policy.queue;
        reasonCodes = policy.reasonCodes;
        if (!criticGate.supported && policy.queue === "insufficient_content") {
          reasonCodes = criticGate.reasonCodes.length ? criticGate.reasonCodes : policy.reasonCodes;
        }
      }
    }

    if (queue === "missing_entity" || reasonCodes.includes(ONTOLOGY_GAP_FILLED_REASON)) {
      const claim = fingerprintHash ? claimByHash.get(fingerprintHash) : null;
      const filled = reasonCodes.includes(ONTOLOGY_GAP_FILLED_REASON);
      gaps.push({
        contractVersion: "snaportho-clinical-claim.v1",
        gapClass: "missing_claim",
        owner: "kg",
        disposition: filled ? "resolved" : "open",
        priorityScore: filled ? 40 : 70,
        claimId: claim?.claimId ?? null,
        claimVersionId: claim?.currentVersionId ?? null,
        canonicalCardId: card.canonicalCardId,
        provider: null,
        nativeQuestionId: null,
        algorithmVersion: CARD_CLAIM_FACTORY_ALGORITHM,
        reasonCodes,
        metadata: {
          canonicalCardVersionId: card.canonicalCardVersionId,
          sourceCardId: card.canonicalCardId,
          rawClozeText: compactText(cloze?.answer ?? "", 200),
          claimId: claim?.claimId ?? null,
          claimVersionId: claim?.currentVersionId ?? null,
          ...(ontologyFill
            ? {
              normalizedLabel: ontologyFill.normalizedLabel,
              proposedEntityId: ontologyFill.entityId,
              entityReuse,
              derivation: ontologyFill.derivation,
              confidence: ontologyFill.confidence,
              approvalReason: ONTOLOGY_GAP_FILLED_APPROVAL_REASON,
            }
            : {
              normalizedLabel: normalizeClinicalText(cloze?.answer ?? ""),
              ...(likenessBlocked
                ? {
                  proposalAssessment: {
                    preferredLabel: likenessBlocked.preferredLabel,
                    normalizedLabel: likenessBlocked.normalizedLabel,
                    entityType: likenessBlocked.entityType,
                    derivation: likenessBlocked.derivation,
                    confidence: likenessBlocked.confidence,
                    entityLike: false,
                    entityLikenessReasons: likenessBlocked.reasons,
                    contextuallySpecific: "uncertain",
                    specificityReasons: [],
                    specificityAnchor: null,
                  },
                }
                : {}),
              ...(specificityBlocked
                ? {
                  proposalAssessment: {
                    preferredLabel: specificityBlocked.preferredLabel,
                    normalizedLabel: specificityBlocked.normalizedLabel,
                    entityType: specificityBlocked.entityType,
                    derivation: specificityBlocked.derivation,
                    confidence: specificityBlocked.confidence,
                    entityLike: true,
                    entityLikenessReasons: [],
                    contextuallySpecific: false,
                    specificityReasons: ["context_insufficient_for_specific_entity"],
                    specificityAnchor: compactText(specificityBlocked.anchor, 200),
                  },
                }
                : {}),
            }),
          canonicalMatchAttempts: gapAttempts.slice(0, 10),
          semanticReasonCodes: [...new Set(semantic.resolutions.flatMap((row) => row.reasonCodes))].slice(0, 10),
        },
        isActive: true,
      });
    }

    assignments.push({
      canonicalCardId: card.canonicalCardId,
      canonicalCardVersionId: card.canonicalCardVersionId,
      noteGuid: card.noteGuid,
      cardOrdinal: card.cardOrdinal,
      contentHash: card.contentHash,
      queue,
      reasonCodes,
      fingerprintHash,
    });
  }

  const proposedClaims = [...claimByHash.values()].sort((left, right) => left.claimId.localeCompare(right.claimId));
  const proposedEntities = [...entityById.values()].sort((left, right) => left.entityId.localeCompare(right.entityId));
  const autoApprovedLinks = [...links].sort((left, right) => left.canonicalCardId.localeCompare(right.canonicalCardId));
  const output: CardClaimFactoryOutput = {
    contractVersion: CARD_CLAIM_FACTORY_CONTRACT_VERSION,
    algorithmVersion: CARD_CLAIM_FACTORY_ALGORITHM,
    factoryRunId: deterministicUuid(`card-claim-factory|${checksum(cards.map((card) => [card.canonicalCardVersionId, card.contentHash]))}|${CARD_CLAIM_FACTORY_IMPLEMENTATION_VERSION}`),
    dryRun: true,
    proposedClaims,
    proposedEntities,
    autoApprovedLinks,
    assignments,
    exceptionQueue: assignments.filter((row) => row.queue !== "auto_approved"),
    gaps,
    machineReviews,
    metrics: {
      cardsProcessed: cards.length,
      autoApprovedCards: assignments.filter((row) => row.queue === "auto_approved").length,
      autoApprovedLinks: autoApprovedLinks.length,
      proposedClaims: proposedClaims.length,
      ontologyFills: proposedEntities.length,
      exceptionCards: assignments.filter((row) => row.queue !== "auto_approved").length,
      mergedClaimCount: autoApprovedLinks.length - new Set(autoApprovedLinks.map((link) => link.claimId)).size,
      canonicalEntityMatches,
      proposedEntitiesCreated,
      proposedEntitiesReused,
      cardsAttachedToProposedEntities,
      shortLabelInsufficientContext,
      entityLikenessBlocked,
      contextSpecificityBlocked,
      openMissingEntity: assignments.filter((row) => row.queue === "missing_entity").length,
    },
  };
  assertDurableSemanticSafe({
    proposedEntities: output.proposedEntities.map((entity) => ({
      entityId: entity.entityId,
      preferredLabel: entity.preferredLabel,
      entityType: entity.entityType,
    })),
    proposedClaims: output.proposedClaims.map((claim) => ({
      claimId: claim.claimId,
      fingerprintHash: claim.fingerprintHash,
      claimText: claim.claimText,
      claimType: claim.claimType,
      predicate: claim.predicate,
      objectText: claim.objectText,
      qualifiers: claim.qualifiers,
    })),
    autoApprovedLinks: output.autoApprovedLinks.map((link) => ({
      canonicalCardId: link.canonicalCardId,
      claimId: link.claimId,
      reviewStatus: link.reviewStatus,
      evidenceLocator: link.evidenceLocator,
      reasonCodes: link.reasonCodes,
    })),
    exceptionQueue: output.exceptionQueue.map(({ noteGuid, ...row }) => {
      void noteGuid;
      return row;
    }),
    gaps: output.gaps,
    metrics: output.metrics,
  });
  if (assignments.length !== cards.length) throw new Error("incomplete_terminal_card_accounting");
  return output;
}

import type { BroBotRetrievalFacet } from "./query-understanding";
import {
  FACET_KEYWORDS,
  MEDICAL_STOP_WORDS,
  normalizeRetrievalText,
} from "./query-understanding";
import {
  compareQualifiers,
  qualifierPenaltyDimensions,
  qualifierProtectedTerms,
  qualifierVeto,
} from "./qualifiers";

export const BROBOT_RERANK_VERSION = "brobot-claims-rerank.v2" as const;

export type BroBotClaimScoreComponents = {
  ftsRank: number;
  trigram: number;
  termCoverage: number;
  idfCoverage: number;
  termMatched: number;
  phraseBonus: number;
  entityScore: number;
  relScore: number;
  cardFtsRank: number;
  cardCoverage: number;
  modeFit: number;
  facetFit: number;
  trust: number;
  importance: number;
  qualityPenalty: number;
};

export type BroBotRerankCandidate = {
  claimId: string;
  claimVersionId: string;
  claimText: string;
  claimType: string;
  predicate: string;
  objectText?: string | null;
  qualifiers?: unknown;
  importanceLevel?: string | null;
  primaryEntityId?: string | null;
  primaryEntityLabel?: string | null;
  approvalMethod?: string | null;
  reviewStatus?: string | null;
  contentSource?: string | null;
  algorithmVersion?: string | null;
  trustTier: "A" | "B";
  poolScore: number;
  channels: string[];
  graphDistance: number;
  /** First-mentioned anatomy/condition vs question anchors (SQL-computed). */
  mentionCoherence?: "anchor" | "related" | "unrelated" | "none";
  components: BroBotClaimScoreComponents;
};

export type BroBotRerankParams = {
  wText: number;
  wFts: number;
  wIdf: number;
  wPhrase: number;
  wTrigram: number;
  wTermCov: number;
  wCard: number;
  wFacet: number;
  wEntity: number;
  wMode: number;
  wTrust: number;
  wQuality: number;
  graphDistance1: number;
  graphDistance2: number;
  genericEntityOnly: number;
  facetMismatchFactor: number;
  wTopicMiss: number;
  wTopAnchorMiss: number;
  popClaimPeds: number;
  popQuestionPeds: number;
  qualifierConflictFactor: number;
  partialMinScore: number;
  unrelatedMention: number;
  anchorMentionBonus: number;
  mmrLambda: number;
  facetBonus: number;
  minScore: number;
  strongScore: number;
  maxClaims: number;
};

/**
 * Calibrated on brobot-claims-benchmark.v1 train (46 prompts) via
 * tmp/bb-calibrate.ts. This object is the single source of truth for
 * production AND evaluation; the retired /tmp/bb-calibrated-params.json
 * snapshot carried these same values. Retune only against the benchmark;
 * never hand-tweak.
 */
export const DEFAULT_RERANK_PARAMS: BroBotRerankParams = {
  wText: 1.0,
  wFts: 0.4,
  wIdf: 0.25,
  wPhrase: 0.05,
  wTrigram: 0.08,
  wTermCov: 0.12,
  wCard: 0.06,
  wFacet: 0.2,
  wEntity: 0.08,
  wMode: 0.05,
  wTrust: 0.05,
  wQuality: 0.3,
  graphDistance1: 0.05,
  graphDistance2: 0.22,
  genericEntityOnly: 0.2,
  facetMismatchFactor: 0.45,
  wTopicMiss: 0.5,
  wTopAnchorMiss: 0.5,
  popClaimPeds: 0.4,
  popQuestionPeds: 0.3,
  qualifierConflictFactor: 0.5,
  partialMinScore: 0.32,
  unrelatedMention: 0.22,
  anchorMentionBonus: 0.04,
  mmrLambda: 0.22,
  facetBonus: 0.04,
  minScore: 0.22,
  strongScore: 0.45,
  maxClaims: 8,
};

export type BroBotRerankedClaim = BroBotRerankCandidate & {
  finalScore: number;
  scoreParts: Record<string, number>;
  packetIndex: string;
  claimFacets: BroBotRetrievalFacet[];
};

export type BroBotRerankResult = {
  version: typeof BROBOT_RERANK_VERSION;
  params: BroBotRerankParams;
  selected: BroBotRerankedClaim[];
  dropped: Array<{ claimId: string; reason: string; finalScore: number }>;
  coverage: "full" | "partial" | "unknown";
  limitations: string[];
  hasConflict: boolean;
  conflicts: BroBotClaimConflict[];
};

const norm01 = (value: number): number => {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return value / (1 + value);
};

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

function tokenize(text: string): string[] {
  return normalizeRetrievalText(text)
    .split(" ")
    .filter((token) => token.length >= 2 && !MEDICAL_STOP_WORDS.has(token));
}

const TYPE_DESIGNATOR_PATTERN =
  /\b(type|grade|stage|garden|gustilo|salter(?:-harris)?)\s*(i{1,3}|iv|vi{0,3}|\d+)\b/gi;
const ROMAN_TO_ARABIC: Readonly<Record<string, string>> = {
  i: "1",
  ii: "2",
  iii: "3",
  iv: "4",
  v: "5",
  vi: "6",
};

/** Normalized (kind, value) designators: "Type III" and "type 3" both yield "type:3". */
function extractTypeDesignators(text: string): Set<string> {
  const found = new Set<string>();
  TYPE_DESIGNATOR_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TYPE_DESIGNATOR_PATTERN.exec(text)) !== null) {
    const kind = match[1].toLowerCase().startsWith("salter")
      ? "salter"
      : match[1].toLowerCase();
    const raw = match[2].toLowerCase();
    found.add(`${kind}:${ROMAN_TO_ARABIC[raw] ?? raw}`);
  }
  return found;
}

function jaccard(a: readonly string[], b: readonly string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setB = new Set(b);
  let intersection = 0;
  for (const token of new Set(a)) if (setB.has(token)) intersection += 1;
  return intersection / (new Set(a).size + setB.size - intersection);
}

// Facet keyword lexicon is shared with query understanding (task-facet
// evidence filtering); imported as FACET_KEYWORDS above.

const CLAIM_TYPE_FACETS: Readonly<
  Record<string, readonly BroBotRetrievalFacet[]>
> = {
  anatomy_pearl: ["anatomy"],
  anatomy: ["anatomy"],
  treatment_indication: ["treatment", "indication", "technique"],
  complication: ["complication", "prognosis"],
  contraindication: ["indication", "treatment", "complication"],
  imaging_point: ["imaging", "diagnosis"],
  imaging: ["imaging", "diagnosis"],
  classification: ["classification"],
  diagnosis: ["diagnosis"],
  prognosis: ["prognosis"],
  threshold: ["threshold"],
};

export function inferClaimFacets(
  candidate: BroBotRerankCandidate,
): BroBotRetrievalFacet[] {
  const facets = new Set<BroBotRetrievalFacet>();
  for (const facet of CLAIM_TYPE_FACETS[candidate.claimType] ?? [])
    facets.add(facet);
  if (candidate.predicate === "indication") {
    facets.add("indication");
    facets.add("treatment");
  }
  if (candidate.predicate === "preferred_treatment") facets.add("treatment");
  if (candidate.predicate === "contraindication") {
    facets.add("indication");
    facets.add("complication");
  }
  if (candidate.predicate === "complication_of") facets.add("complication");
  if (candidate.predicate === "imaging_finding") {
    facets.add("imaging");
    facets.add("diagnosis");
  }
  const text = ` ${normalizeRetrievalText(candidate.claimText)} `;
  if (/\d/.test(text)) facets.add("threshold");
  for (const [facet, keywords] of Object.entries(FACET_KEYWORDS) as Array<
    [BroBotRetrievalFacet, readonly string[]]
  >) {
    if (keywords.some((keyword) => text.includes(keyword))) facets.add(facet);
  }
  // Injury/rupture words denote the diagnosis itself (syndesmosis injury) as
  // often as a complication (nerve injury); count for both facets.
  if (text.includes("injur") || text.includes("rupture")) {
    facets.add("diagnosis");
    facets.add("complication");
  }
  return [...facets];
}

export function eligibilityRecheck(
  candidate: Pick<
    BroBotRerankCandidate,
    "reviewStatus" | "contentSource" | "approvalMethod" | "trustTier"
  >,
): string | null {
  const { reviewStatus, contentSource, approvalMethod, trustTier } = candidate;
  if (trustTier === "A") {
    if (reviewStatus !== "approved" || contentSource !== "verified") {
      return "eligibility_recheck_failed: tier-A without approved/verified markers";
    }
    if (
      approvalMethod !== "human_review" &&
      approvalMethod !== "sampled_audit" &&
      approvalMethod !== "machine_consensus"
    ) {
      return "eligibility_recheck_failed: tier-A with unpermitted approval method";
    }
    return null;
  }
  if (
    reviewStatus === "needs_review" ||
    reviewStatus === "rejected" ||
    reviewStatus === "superseded"
  ) {
    return `eligibility_recheck_failed: factory review_status=${reviewStatus}`;
  }
  return null;
}

export type BroBotRerankScored = BroBotRerankedClaim & { tokens: string[] };

/**
 * Drop byte-identical (post-normalization) duplicate claim texts, keeping the
 * highest pool-score copy. The factory emits duplicate claim IDs with
 * identical text; without this they crowd out distinct facts.
 */
export function dedupeCandidates(candidates: BroBotRerankCandidate[]): {
  unique: BroBotRerankCandidate[];
  duplicates: Array<{ claimId: string; reason: string; finalScore: number }>;
} {
  const best = new Map<string, BroBotRerankCandidate>();
  for (const candidate of candidates) {
    const key = normalizeRetrievalText(candidate.claimText);
    const incumbent = best.get(key);
    if (!incumbent || candidate.poolScore > incumbent.poolScore)
      best.set(key, candidate);
  }
  const unique = [...best.values()];
  const kept = new Set(unique.map((candidate) => candidate.claimId));
  const duplicates = candidates
    .filter((candidate) => !kept.has(candidate.claimId))
    .map((candidate) => ({
      claimId: candidate.claimId,
      reason: "duplicate_text",
      finalScore: candidate.poolScore,
    }));
  return { unique, duplicates };
}

export function scoreCandidates(input: {
  query: string;
  terms: readonly string[];
  facets: readonly BroBotRetrievalFacet[];
  candidates: BroBotRerankCandidate[];
  params: BroBotRerankParams;
  termIdf?: ReadonlyArray<{ term: string; idf: number }>;
  anchors?: ReadonlyArray<{ label?: string | null }>;
}): { scored: BroBotRerankScored[]; dropped: BroBotRerankResult["dropped"] } {
  const params = input.params;
  const questionTokens = tokenize(input.query);
  const scored: BroBotRerankScored[] = [];
  const dropped: BroBotRerankResult["dropped"] = [];
  // IDF-weighted topic miss: a claim that skips the question's distinctive
  // words (spine claim for a shoulder question) is off-topic even with
  // strong generic overlap. IDF is global (from the SQL packet over all
  // eligible claims): pool-relative IDF fails because the pool is topically
  // narrow, so question-distinctive words look pool-common. Terms the SQL
  // marks idf=0 (hapax) carry no signal and are skipped, mirroring SQL.
  // Subtracting the pool minimum keeps the best-covered claim unpenalized.
  const poolSize = input.candidates.length;
  const normTexts = new Map<string, string>();
  const tokenSets = new Map<string, Set<string>>();
  const tokenLists = new Map<string, string[]>();
  for (const candidate of input.candidates) {
    normTexts.set(
      candidate.claimId,
      ` ${normalizeRetrievalText(candidate.claimText)} `,
    );
    const tokens = tokenize(candidate.claimText);
    tokenSets.set(candidate.claimId, new Set(tokens));
    tokenLists.set(candidate.claimId, tokens);
  }
  // Term coverage mirrors SQL matched_terms: singular-fold plus a len-3
  // stem prefix for long words, so "syndesmotic" covers "syndesmosis" and
  // plural query terms ("fractures") cover singular claim text.
  const covers = (claimId: string, term: string): boolean => {
    if (term.length < 4) return (tokenSets.get(claimId) ?? new Set()).has(term);
    const text = normTexts.get(claimId) ?? "";
    if (text.includes(term)) return true;
    if (
      term.length > 3 &&
      term.endsWith("s") &&
      text.includes(term.slice(0, -1))
    )
      return true;
    if (term.length >= 10 && text.includes(term.slice(0, -3))) return true;
    return false;
  };
  // Clinical qualifier comparison per candidate (computed once, reused by
  // vetoes, penalties, and maxCov protection below).
  const qualifierById = new Map(
    input.candidates.map((candidate) => [
      candidate.claimId,
      compareQualifiers(input.query, candidate.claimText, candidate.predicate),
    ]),
  );
  const qualifierProtectedById = new Map<string, Set<string>>();
  // Conflict-only protection: a candidate that conflicts with the query on
  // a clinical dimension never gets the dimension's terms maxCov-excused.
  // (Globally protecting all qualifier-evidencing terms was ablated on
  // train and rejected: it relatively boosts same-anatomy hard negatives
  // through min-subtraction, causing leaks.)
  for (const candidate of input.candidates) {
    const comparison = qualifierById.get(candidate.claimId);
    qualifierProtectedById.set(
      candidate.claimId,
      new Set(
        comparison
          ? qualifierProtectedTerms(comparison, input.terms, true)
          : [],
      ),
    );
  }
  const sqlIdf = new Map<string, number>();
  for (const entry of input.termIdf ?? [])
    sqlIdf.set(entry.term, Number(entry.idf) || 0);
  const useSqlIdf = sqlIdf.size > 0;
  const termIdf = new Map<string, number>();
  let idfSum = 0;
  for (const term of input.terms) {
    if (useSqlIdf && sqlIdf.has(term)) {
      // SQL zeroes hapax idf for denominator stability, but for coverage a
      // hapax term ("firearm") is distinctive: a claim covering it nails
      // the question's core. Assign a mid-high idf (3.0, near the median
      // content idf) so it weighs without dominating: at the 5.0 cap,
      // vague hapax words ("urgency", "consult") would drown real terms.
      // Universally-missed hapax terms wash out via min-subtraction.
      const idf = sqlIdf.get(term) ?? 0;
      termIdf.set(term, idf > 0 ? idf : 3.0);
      idfSum += idf > 0 ? idf : 3.0;
      continue;
    }
    let df = 0;
    for (const candidate of input.candidates)
      if (covers(candidate.claimId, term)) df += 1;
    const idf = Math.log(1 + poolSize / (1 + df));
    termIdf.set(term, idf);
    idfSum += idf;
  }
  // Asymmetric miss: covering the question's rarest term excuses missing
  // commoner context words (a TUBS definition need not repeat "shoulder
  // instability"; a Bankart-lesion answer need not repeat "19-year-old").
  // Only terms strictly rarer than the best-covered term count as missed.
  // EXCEPT qualifier-protected terms: when a candidate conflicts with the
  // query on a clinical dimension, the dimension's query terms are never
  // excused by maxCov (a plateau claim must not waive "ankle" via
  // "fracture"). Critical conflicts dominate semantic similarity.
  const topicMissOf = (claimId: string): number => {
    if (idfSum === 0) return 0;
    let bestCovered = Number.NEGATIVE_INFINITY;
    for (const [term, idf] of termIdf) {
      if (covers(claimId, term) && idf > bestCovered) bestCovered = idf;
    }
    const prot = qualifierProtectedById.get(claimId) ?? new Set<string>();
    let miss = 0;
    for (const [term, idf] of termIdf) {
      if (idf > bestCovered) miss += idf;
      else if (prot.has(term) && !covers(claimId, term)) miss += idf;
    }
    return miss / idfSum;
  };
  let minTopicMiss = Infinity;
  for (const candidate of input.candidates) {
    minTopicMiss = Math.min(minTopicMiss, topicMissOf(candidate.claimId));
  }
  if (!Number.isFinite(minTopicMiss)) minTopicMiss = 0;
  const queryDesignators = extractTypeDesignators(input.query);
  // Aboutness: a claim whose primary entity matches nothing in the question
  // and which mentions the first query term only late ("pivot-shift ... than
  // ... Lachman examination", "muscles of the anterior compartment ...:
  // Peroneus tertius") is ABOUT the other entity, not the question's topic.
  // Drop only when the pool holds a primary-matching (or unlabeled) claim,
  // so a pool with no good answer keeps its best instead of emptying.
  // Claims covering zero terms are left to the topic-miss penalty (short
  // threshold claims for vague questions are legitimately terse).
  const primaryTokensOf = (candidate: BroBotRerankCandidate): string[] =>
    candidate.primaryEntityLabel ? tokenize(candidate.primaryEntityLabel) : [];
  const primaryMatches = (candidate: BroBotRerankCandidate): boolean => {
    const tokens = primaryTokensOf(candidate);
    if (tokens.length === 0) return true;
    return tokens.some((token) =>
      input.terms.some(
        (term) =>
          token === term || token.includes(term) || term.includes(token),
      ),
    );
  };
  // Narrow asks (1-2 facets) already facet-vet their claims; aboutness only
  // guards broad/vague asks where off-topic claims slip through overlap.
  const aboutnessArmed =
    input.terms.length >= 1 &&
    (input.facets.length === 0 || input.facets.length > 2) &&
    input.candidates.some(
      (candidate) =>
        primaryTokensOf(candidate).length === 0 || primaryMatches(candidate),
    );
  const rawTokenLists = new Map<string, string[]>();
  for (const candidate of input.candidates) {
    rawTokenLists.set(
      candidate.claimId,
      normalizeRetrievalText(candidate.claimText).split(" "),
    );
  }
  const tokenCovers = (token: string, term: string): boolean => {
    if (term.length < 4) return token === term;
    if (token.includes(term)) return true;
    if (
      term.length > 3 &&
      term.endsWith("s") &&
      token.includes(term.slice(0, -1))
    )
      return true;
    if (term.length >= 10 && token.includes(term.slice(0, -3))) return true;
    return false;
  };
  const firstTermPos = (claimId: string): number => {
    const tokens = rawTokenLists.get(claimId) ?? [];
    for (let i = 0; i < tokens.length; i += 1) {
      const token = tokens[i];
      for (const term of input.terms) {
        if (tokenCovers(token, term)) return i;
      }
    }
    return Number.POSITIVE_INFINITY;
  };
  // Population alignment: a pediatric claim for a non-pediatric question
  // (leg-length discrepancy for a stiff adult knee) answers the wrong
  // population, and vice versa (adult classification for a pediatric
  // question). Substring matching handles slash-joined forms
  // ("children/adolescents"); "kid" and "physis" stay whole-word so they
  // never match "kidney" or "metaphysis".
  const PEDS_SUBSTRINGS = [
    "pediatric",
    "paediatric",
    "children",
    "child",
    "adolescent",
    "skeletally",
    "immature",
    "juvenile",
    "physeal",
    "kids",
  ];
  const PEDS_WHOLE_WORDS = new Set(["kid", "physis"]);
  const isPedsText = (text: string, tokens: readonly string[]): boolean =>
    PEDS_SUBSTRINGS.some((word) => text.includes(word)) ||
    tokens.some((token) => PEDS_WHOLE_WORDS.has(token));
  const questionPeds = isPedsText(
    ` ${normalizeRetrievalText(input.query)} `,
    tokenize(input.query),
  );
  // Top-anchor core: the question's highest-scoring KG entity names its core
  // topic. A claim that matches peripheral anchors ("volar") while missing
  // every top-anchor word ("finger", "approach") is off-core even when its
  // words are rare. The top anchor is trusted only when the question itself
  // evidences its whole label ("Shoulder Approaches" for a question that
  // never says "approach" is a lexical accident, not the core). Only anchor
  // words that are also query terms count, and claims matching no anchor at
  // all are exempt (short terse answers).
  const anchorTokenSets = (input.anchors ?? []).map(
    (anchor) =>
      new Set(
        tokenize(anchor.label ?? "").filter((token) =>
          input.terms.includes(token),
        ),
      ),
  );
  const topAnchorLabelTokens =
    (input.anchors ?? []).length > 0
      ? tokenize((input.anchors ?? [])[0].label ?? "")
      : [];
  const topAnchorValid =
    topAnchorLabelTokens.length > 0 &&
    topAnchorLabelTokens.every((token) => input.terms.includes(token));
  const topAnchorTerms =
    topAnchorValid && anchorTokenSets.length > 0 ? [...anchorTokenSets[0]] : [];
  const anyAnchorTerm = new Set(
    anchorTokenSets.flatMap((tokens) => [...tokens]),
  );
  const coversTerm = (claimId: string, term: string): boolean =>
    covers(claimId, term);
  for (const candidate of input.candidates) {
    if (
      aboutnessArmed &&
      primaryTokensOf(candidate).length > 0 &&
      !primaryMatches(candidate) &&
      firstTermPos(candidate.claimId) !== Number.POSITIVE_INFINITY &&
      firstTermPos(candidate.claimId) > 6
    ) {
      dropped.push({
        claimId: candidate.claimId,
        reason: "aboutness_primary_mismatch",
        finalScore: 0,
      });
      continue;
    }
    const violation = eligibilityRecheck(candidate);
    if (violation) {
      dropped.push({
        claimId: candidate.claimId,
        reason: violation,
        finalScore: 0,
      });
      continue;
    }
    // Hard qualifier veto: a claim contradicting the question on a
    // veto dimension (flexion vs extension, L4 vs L5, indication vs
    // contraindication) is excluded no matter its semantic overlap.
    const qualifierComparison = qualifierById.get(candidate.claimId);
    const vetoDimension = qualifierComparison
      ? qualifierVeto(qualifierComparison)
      : null;
    if (vetoDimension) {
      dropped.push({
        claimId: candidate.claimId,
        reason: `qualifier_veto:${vetoDimension}`,
        finalScore: 0,
      });
      continue;
    }
    const qualifierPenaltyCount = qualifierComparison
      ? qualifierPenaltyDimensions(qualifierComparison).length
      : 0;
    const c = candidate.components;
    const tokens = tokenize(candidate.claimText);
    const questionCoverage =
      questionTokens.length === 0
        ? 0
        : questionTokens.filter(
            (token) =>
              tokens.includes(token) ||
              tokens.includes(`${token}s`) ||
              (token.endsWith("s") && tokens.includes(token.slice(0, -1))),
          ).length / questionTokens.length;
    const textScore =
      params.wFts * norm01(c.ftsRank) +
      params.wIdf * clamp01(c.idfCoverage) +
      params.wPhrase * clamp01(c.phraseBonus) +
      params.wTrigram * clamp01(c.trigram) +
      params.wTermCov * clamp01(c.termCoverage);
    const cardScore =
      0.5 * norm01(c.cardFtsRank) + 0.5 * clamp01(c.cardCoverage);
    const claimFacets = inferClaimFacets(candidate);
    const facetOverlap =
      claimFacets.some((facet) => input.facets.includes(facet)) ||
      c.facetFit >= 1;
    const facetScore =
      input.facets.length === 0 ? 0.5 : facetOverlap ? 1 : 0.25;
    // Facet mismatch: the claim is recognizably about a facet the question
    // did not ask for (diagnosis claim for an indication question). Applied
    // multiplicatively because strong topic matches otherwise swamp an
    // additive penalty. Claims with no identifiable facet stay neutral.
    const mismatched =
      input.facets.length > 0 && claimFacets.length > 0 && !facetOverlap;
    // Type-designator mismatch: the question asks about Type III and the
    // claim answers a different designator ("treatment for Type I
    // supracondylar" for a Type III question). Claims mentioning the
    // question's own designator (comparisons, lists) are exempt.
    const claimPeds = isPedsText(
      normTexts.get(candidate.claimId) ?? "",
      tokens,
    );
    const popMismatchFactor =
      claimPeds && !questionPeds
        ? params.popClaimPeds
        : !claimPeds && questionPeds
          ? params.popQuestionPeds
          : 1;
    const offCore =
      topAnchorTerms.length > 0 &&
      [...anyAnchorTerm].some((term) => coversTerm(candidate.claimId, term)) &&
      !topAnchorTerms.some((term) => coversTerm(candidate.claimId, term));
    const claimDesignators = extractTypeDesignators(candidate.claimText);
    const typeMismatched =
      queryDesignators.size > 0 &&
      claimDesignators.size > 0 &&
      [...queryDesignators].every(
        (designator) => !claimDesignators.has(designator),
      );
    const hasTextSupport =
      c.ftsRank > 0 ||
      c.termMatched >= 1 ||
      c.phraseBonus >= 1 ||
      c.trigram >= 0.55 ||
      c.cardFtsRank > 0 ||
      c.cardCoverage > 0;
    const entityOnly = !hasTextSupport && c.entityScore > 0;
    // Mention coherence is trusted only when the top anchor is valid (its
    // label fully evidenced by the query). Against junk anchors (ankle
    // entities for a firearm question), related/unrelated verdicts are noise.
    // With no anchor data at all, fall back to trusting the SQL verdict.
    const coherenceTrusted =
      (input.anchors ?? []).length === 0 || topAnchorTerms.length > 0;
    const coherence =
      !coherenceTrusted ||
      candidate.mentionCoherence === "none" ||
      candidate.mentionCoherence == null
        ? 0
        : candidate.mentionCoherence === "unrelated"
          ? -params.unrelatedMention
          : candidate.mentionCoherence === "anchor"
            ? params.anchorMentionBonus
            : 0;
    const parts: Record<string, number> = {
      text: params.wText * textScore,
      questionCoverage: 0.1 * questionCoverage,
      card: params.wCard * cardScore,
      facet: params.wFacet * facetScore,
      facetMismatchFactor: mismatched ? params.facetMismatchFactor : 1,
      typeMismatchFactor: typeMismatched ? 0.5 : 1,
      popMismatchFactor,
      qualifierConflictFactor:
        qualifierPenaltyCount > 0 ? params.qualifierConflictFactor : 1,
      entity: params.wEntity * clamp01(c.entityScore),
      mode: params.wMode * clamp01(c.modeFit),
      trust: params.wTrust * clamp01(c.trust),
      quality: -params.wQuality * clamp01(c.qualityPenalty),
      graphDistance: -(candidate.graphDistance >= 2
        ? params.graphDistance2
        : candidate.graphDistance === 1
          ? params.graphDistance1
          : 0),
      genericEntityOnly: entityOnly ? -params.genericEntityOnly : 0,
      // Population-mismatched claims get no pool-relative benefit of the
      // doubt (absolute miss): when every pool claim misses the same rare
      // words, min-subtraction would erase a wrong-population claim's miss
      // entirely. Topical peds claims still score well (their miss is ~0).
      topicMiss:
        popMismatchFactor < 1
          ? -params.wTopicMiss * topicMissOf(candidate.claimId)
          : -params.wTopicMiss *
            (topicMissOf(candidate.claimId) - minTopicMiss),
      topAnchorMiss: offCore ? -params.wTopAnchorMiss : 0,
      mentionCoherence: coherence,
    };
    const additive = Object.entries(parts)
      .filter(
        ([key]) =>
          key !== "facetMismatchFactor" &&
          key !== "typeMismatchFactor" &&
          key !== "popMismatchFactor" &&
          key !== "qualifierConflictFactor",
      )
      .reduce((sum, [, part]) => sum + part, 0);
    const finalScore =
      additive *
      (mismatched ? params.facetMismatchFactor : 1) *
      (typeMismatched ? 0.5 : 1) *
      popMismatchFactor *
      (qualifierPenaltyCount > 0 ? params.qualifierConflictFactor : 1);
    if (finalScore < params.minScore) {
      dropped.push({
        claimId: candidate.claimId,
        reason: "below_relevance_threshold",
        finalScore,
      });
      continue;
    }
    scored.push({
      ...candidate,
      finalScore,
      scoreParts: parts,
      packetIndex: "",
      claimFacets,
      tokens,
    });
  }
  scored.sort(
    (a, b) =>
      b.finalScore - a.finalScore ||
      b.poolScore - a.poolScore ||
      (a.claimId < b.claimId ? -1 : 1),
  );
  return { scored, dropped };
}

export function selectDiverse(input: {
  scored: BroBotRerankScored[];
  facets: readonly BroBotRetrievalFacet[];
  params: BroBotRerankParams;
  queryTokens?: readonly string[];
}): { selected: BroBotRerankScored[]; overflow: BroBotRerankScored[] } {
  const { scored, facets, params } = input;
  const queryTerms = new Set(input.queryTokens ?? []);
  const noveltyTokens = (tokens: readonly string[]): string[] =>
    tokens.filter((token) => !queryTerms.has(token));
  const selected: BroBotRerankScored[] = [];
  const remaining = [...scored];
  const coveredFacets = new Set<BroBotRetrievalFacet>();
  while (remaining.length > 0 && selected.length < params.maxClaims) {
    let bestIdx = 0;
    let bestValue = -Infinity;
    for (let i = 0; i < remaining.length; i += 1) {
      const candidate = remaining[i];
      // Shared question words do not make two claims paraphrases of each
      // other; similarity counts only non-query tokens.
      const maxSim = selected.reduce(
        (max, other) =>
          Math.max(
            max,
            jaccard(
              noveltyTokens(candidate.tokens),
              noveltyTokens(other.tokens),
            ),
          ),
        0,
      );
      const newFacets = candidate.claimFacets.filter(
        (facet) => facets.includes(facet) && !coveredFacets.has(facet),
      ).length;
      const value =
        candidate.finalScore -
        params.mmrLambda * maxSim +
        params.facetBonus * Math.min(newFacets, 2);
      if (value > bestValue) {
        bestValue = value;
        bestIdx = i;
      }
    }
    const [winner] = remaining.splice(bestIdx, 1);
    selected.push(winner);
    for (const facet of winner.claimFacets) coveredFacets.add(facet);
  }
  selected.sort(
    (a, b) =>
      b.finalScore - a.finalScore ||
      b.poolScore - a.poolScore ||
      (a.claimId < b.claimId ? -1 : 1),
  );
  return { selected, overflow: remaining };
}

const NUMBER_PATTERN =
  /(\d+(?:\.\d+)?)\s*(%|percent|mm|cm|degrees?|°|weeks?|wks?|months?|years?|yrs?|hours?|hrs?|minutes?|mins?)?/gi;
const NEGATION_PATTERN =
  /\b(not|no|never|without|contraindicat|avoid|cannot|can't|don't|does not|neither|nor)\b/i;

function extractNumbers(text: string): string[] {
  const numbers: string[] = [];
  NUMBER_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = NUMBER_PATTERN.exec(text)) !== null) {
    numbers.push(`${match[1]}${(match[2] ?? "").toLowerCase()}`);
  }
  return [...new Set(numbers)];
}

export type BroBotClaimConflict = {
  claimIds: [string, string];
  kind: "number" | "polarity" | "indication";
  detail: string;
};

export function detectConflicts(
  selected: BroBotRerankScored[],
): BroBotClaimConflict[] {
  const conflicts: BroBotClaimConflict[] = [];
  for (let i = 0; i < selected.length; i += 1) {
    for (let j = i + 1; j < selected.length; j += 1) {
      const a = selected[i];
      const b = selected[j];
      const similarity = jaccard(a.tokens, b.tokens);
      if (similarity < 0.3) continue;
      const numbersA = extractNumbers(a.claimText);
      const numbersB = extractNumbers(b.claimText);
      if (
        numbersA.length > 0 &&
        numbersB.length > 0 &&
        !numbersA.some((number) => numbersB.includes(number))
      ) {
        conflicts.push({
          claimIds: [a.claimId, b.claimId],
          kind: "number",
          detail: `Conflicting numbers (${numbersA.join(", ")} vs ${numbersB.join(", ")}) in similar claims.`,
        });
        continue;
      }
      const negA = NEGATION_PATTERN.test(a.claimText);
      const negB = NEGATION_PATTERN.test(b.claimText);
      if (negA !== negB) {
        conflicts.push({
          claimIds: [a.claimId, b.claimId],
          kind: "polarity",
          detail:
            "Opposite polarity in similar claims; verify before applying.",
        });
        continue;
      }
      const indicationPredicates = new Set([
        "indication",
        "preferred_treatment",
      ]);
      const aIndication = indicationPredicates.has(a.predicate);
      const bContra = b.predicate === "contraindication";
      const bIndication = indicationPredicates.has(b.predicate);
      const aContra = a.predicate === "contraindication";
      if ((aIndication && bContra) || (bIndication && aContra)) {
        conflicts.push({
          claimIds: [a.claimId, b.claimId],
          kind: "indication",
          detail:
            "Indication/contraindication mismatch on a similar topic; verify before applying.",
        });
      }
    }
  }
  return conflicts;
}

export function rerankClaims(input: {
  query: string;
  terms: readonly string[];
  facets: readonly BroBotRetrievalFacet[];
  candidates: BroBotRerankCandidate[];
  params?: Partial<BroBotRerankParams>;
  unsupportedTopic?: string | null;
  supportLevel?: "supported" | "partially_supported" | "unsupported";
  termIdf?: ReadonlyArray<{ term: string; idf: number }>;
  anchors?: ReadonlyArray<{ label?: string | null }>;
}): BroBotRerankResult {
  const params: BroBotRerankParams = {
    ...DEFAULT_RERANK_PARAMS,
    ...input.params,
  };
  const supportLevel =
    input.supportLevel ??
    (input.unsupportedTopic ? "unsupported" : "supported");
  if (supportLevel === "unsupported") {
    const topic = input.unsupportedTopic ?? "an unsupported topic";
    return {
      version: BROBOT_RERANK_VERSION,
      params,
      selected: [],
      dropped: input.candidates.map((candidate) => ({
        claimId: candidate.claimId,
        reason: `unsupported_topic:${topic}`,
        finalScore: 0,
      })),
      coverage: "unknown",
      limitations: [
        `Question is about ${topic}, which the knowledge graph does not cover; answering without KG claims.`,
      ],
      hasConflict: false,
      conflicts: [],
    };
  }
  // Partially supported questions serve only high-confidence claims: the
  // bar rises from minScore to partialMinScore (procedural sequences,
  // patient-specific context, evidence synthesis).
  const effectiveParams =
    supportLevel === "partially_supported"
      ? { ...params, minScore: params.partialMinScore }
      : params;
  const { unique, duplicates } = dedupeCandidates(input.candidates);
  const { scored, dropped } = scoreCandidates({
    ...input,
    candidates: unique,
    params: effectiveParams,
    termIdf: input.termIdf,
    anchors: input.anchors,
  });
  dropped.unshift(...duplicates);
  // Facet-compatibility gate: a narrow ask (indications, classification)
  // with zero facet-compatible claims above threshold means the KG has no
  // on-facet evidence; returning topical-but-wrong-facet claims would
  // mislead (diagnosis claims as indications). Broad/vague asks skip this.
  if (
    input.facets.length > 0 &&
    input.facets.length <= 3 &&
    scored.length > 0
  ) {
    // Topic check: facet-compatible but topically alien claims (TKA
    // indications for an ACL indications question) must not satisfy the
    // gate. Require query-term hits in the claim text alongside the facet.
    const needTopicHits = input.terms.length >= 4 ? 2 : 1;
    const compatible = scored.filter((claim) => {
      const facetOk =
        claim.claimFacets.some((facet) => input.facets.includes(facet)) ||
        claim.components.facetFit >= 1;
      if (!facetOk) return false;
      const text = ` ${normalizeRetrievalText(claim.claimText)} `;
      const hits = input.terms.filter((term) => text.includes(term)).length;
      return hits >= needTopicHits;
    });
    if (compatible.length === 0) {
      for (const claim of scored) {
        dropped.push({
          claimId: claim.claimId,
          reason: "no_facet_compatible_claim",
          finalScore: claim.finalScore,
        });
      }
      return {
        version: BROBOT_RERANK_VERSION,
        params,
        selected: [],
        dropped,
        coverage: "unknown",
        limitations: [
          `No claims match the requested facets (${input.facets.join(", ")}); answering without KG claims.`,
        ],
        hasConflict: false,
        conflicts: [],
      };
    }
  }
  const { selected, overflow } = selectDiverse({
    scored,
    facets: input.facets,
    params,
    queryTokens: tokenize(input.query),
  });
  for (const extra of overflow) {
    dropped.push({
      claimId: extra.claimId,
      reason: "diversity_cut",
      finalScore: extra.finalScore,
    });
  }
  const conflicts = detectConflicts(selected);
  const limitations: string[] = [];
  if (supportLevel === "partially_supported") {
    limitations.push(
      "Partially supported question; only high-confidence claims addressing the supported part are served.",
    );
  }
  if (conflicts.length > 0) {
    limitations.push(
      `Top claims conflict (${conflicts.map((conflict) => conflict.kind).join(", ")}); verify qualifiers before applying.`,
    );
  }
  selected.forEach((claim, index) => {
    claim.packetIndex = `C${index + 1}`;
  });
  const coverage: BroBotRerankResult["coverage"] =
    selected.length === 0
      ? "unknown"
      : supportLevel === "partially_supported" ||
          conflicts.length > 0 ||
          selected[0].finalScore < params.strongScore
        ? "partial"
        : "full";
  if (selected.length === 0) {
    limitations.push(
      "No claims met the relevance threshold; answering without KG claims.",
    );
  } else if (coverage === "partial" && conflicts.length === 0) {
    limitations.push(
      "Claim support is weak; treat packet claims as adjuncts, not answers.",
    );
  }
  const selectedClean: BroBotRerankedClaim[] = selected.map(
    (claim) =>
      Object.fromEntries(
        Object.entries(claim).filter(([key]) => key !== "tokens"),
      ) as unknown as BroBotRerankedClaim,
  );
  return {
    version: BROBOT_RERANK_VERSION,
    params,
    selected: selectedClean,
    dropped,
    coverage,
    limitations,
    hasConflict: conflicts.length > 0,
    conflicts,
  };
}

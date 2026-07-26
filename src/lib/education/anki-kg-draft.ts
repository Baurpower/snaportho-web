/**
 * Card-driven KG draft suggestions for the Anki reviewer panel.
 * Deterministic lexical draft first; optional refine comment; no live graph writes.
 */
import { createHash } from "node:crypto";
import {
  normalizeClinicalText,
  stripNonClinicalMarkup,
  type EntityIndexRow,
  type EphemeralCard,
  runSemanticCard,
} from "./deck-semantic-mapping";

export const KG_DRAFT_CONTRACT = "snaportho-anki-kg-draft.v1" as const;

export type MappingRole =
  | "teaches"
  | "tests"
  | "explains"
  | "demonstrates"
  | "context_only"
  | "broadly_related";

export type KgDraftSuggestion = {
  id: string;
  kind: "link_existing" | "new_entity" | "new_alias" | "no_mapping";
  confidence: number;
  mappingRole: MappingRole;
  canonicalEntityId?: string;
  label?: string;
  entityType?: string;
  preferredLabel?: string;
  entityTypeProposed?: string;
  description?: string;
  existingEntityId?: string;
  reasonCodes: string[];
  evidenceExcerpt?: string;
  defaultSelected: boolean;
};

export type KgCardEvidence = {
  stem: string;
  answerConcepts: string[];
  clozeClaims: Array<{
    answer: string;
    context: string;
  }>;
  searchedTerms: string[];
};

export type KgDraftResult = {
  contractVersion: typeof KG_DRAFT_CONTRACT;
  algorithm: "lexical_semantic_v2";
  suggestions: KgDraftSuggestion[];
  cardEvidence: KgCardEvidence;
  ontologyGaps: Array<{
    phrase: string;
    suggestedAction: "review_missing_entity_or_alias";
  }>;
  cardPlainLength: number;
  entityIndexSize: number;
  refineCommentUsed: boolean;
};

function clozeAnswers(
  fields: Array<{ name: string; rawValue?: string; value?: string; plainText?: string }>,
): string[] {
  const answers: string[] = [];
  for (const field of fields) {
    const raw = String(field.rawValue ?? field.value ?? "");
    for (const match of raw.matchAll(/\{\{c\d+::([^{}]*?)(?:::[^{}]*?)?\}\}/gi)) {
      const answer = stripNonClinicalMarkup(match[1] ?? "").trim();
      if (answer.length >= 2 && answer.length <= 160) answers.push(answer);
    }
  }
  return [...new Set(answers)].slice(0, 12);
}

/**
 * Reconstruct each cloze inside its own sentence/list item. A card may test
 * several facts; using the whole field as every answer's subject merges them.
 */
function contextualClozeClaims(
  fields: Array<{ name: string; rawValue?: string; value?: string; plainText?: string }>,
): KgCardEvidence["clozeClaims"] {
  const claims: KgCardEvidence["clozeClaims"] = [];
  const seen = new Set<string>();
  const clozePattern = /\{\{c\d+::([^{}]*?)(?:::[^{}]*?)?\}\}/gi;

  for (const field of fields) {
    const raw = String(field.rawValue ?? field.value ?? "");
    const prepared = raw
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(?:div|p|li)>/gi, "\n");
    for (const match of prepared.matchAll(clozePattern)) {
      const answer = stripNonClinicalMarkup(match[1] ?? "").trim();
      if (answer.length < 2 || answer.length > 160 || match.index == null) continue;

      const start = Math.max(
        prepared.lastIndexOf("\n", match.index),
        prepared.lastIndexOf(".", match.index),
        prepared.lastIndexOf("?", match.index),
        prepared.lastIndexOf("!", match.index),
      ) + 1;
      const after = match.index + match[0].length;
      const endings = [
        prepared.indexOf("\n", after),
        prepared.indexOf(".", after),
        prepared.indexOf("?", after),
        prepared.indexOf("!", after),
      ].filter((index) => index >= 0);
      const end = endings.length ? Math.min(...endings) + 1 : prepared.length;
      const context = stripNonClinicalMarkup(
        prepared
          .slice(start, end)
          .replace(clozePattern, (_whole, value: string) => value),
      )
        .replace(/\s+/g, " ")
        .trim();
      const key = `${normalizeClinicalText(answer)}|${normalizeClinicalText(context)}`;
      if (context && !seen.has(key)) {
        seen.add(key);
        claims.push({ answer, context });
      }
    }
  }
  return claims.slice(0, 12);
}

function cardStem(
  fields: Array<{ name: string; rawValue?: string; value?: string; plainText?: string }>,
): string {
  const preferred = ["Text", "Front", "Back"];
  const field =
    preferred.map((name) => fields.find((item) => item.name === name)).find(Boolean) ??
    fields[0];
  if (!field) return "";
  const raw = String(field.rawValue ?? field.value ?? field.plainText ?? "");
  return stripNonClinicalMarkup(raw.replace(/\{\{c\d+::[^{}]*?\}\}/gi, " "))
    .split(/[?\n]/)[0]!
    .trim()
    .slice(0, 240);
}

export function analyzeKgCardEvidence(
  fields: Array<{ name: string; rawValue?: string; value?: string; plainText?: string }>,
): KgCardEvidence {
  const plain = plainFromFields(fields);
  const clozeClaims = contextualClozeClaims(fields);
  return {
    stem: cardStem(fields),
    answerConcepts: clozeClaims.length
      ? [...new Set(clozeClaims.map((claim) => claim.answer))]
      : clozeAnswers(fields),
    clozeClaims,
    searchedTerms: significantTokens(plain).slice(0, 12),
  };
}

function sha(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

function shortId(seed: string): string {
  return sha(seed).slice(0, 16);
}

function plainFromFields(
  fields: Array<{ name: string; rawValue?: string; value?: string; plainText?: string }>,
): string {
  const prefer = ["Text", "Extra", "Front", "Back"];
  const parts: string[] = [];
  for (const name of prefer) {
    const f = fields.find((x) => x.name === name);
    if (!f) continue;
    const t = stripNonClinicalMarkup(String(f.plainText ?? f.rawValue ?? f.value ?? ""));
    if (t) parts.push(t);
  }
  if (!parts.length) {
    for (const f of fields) {
      const t = stripNonClinicalMarkup(String(f.plainText ?? f.rawValue ?? f.value ?? ""));
      if (t) parts.push(t);
    }
  }
  return parts.join("\n").slice(0, 4000);
}

/** Significant tokens for entity candidate fetch / comment merge. */
export function significantTokens(text: string): string[] {
  const stop = new Set([
    "the", "and", "for", "with", "from", "that", "this", "what", "when", "which",
    "have", "has", "are", "was", "were", "been", "into", "onto", "also", "than",
    "then", "them", "they", "their", "about", "after", "before", "most", "more",
    "less", "over", "under", "between", "four", "three", "five", "function",
    "functions", "following", "best", "test", "view", "patient", "true", "may",
  ]);
  return [
    ...new Set(
      normalizeClinicalText(text)
        .split(" ")
        .map((t) => t.trim())
        .filter((t) => t.length >= 4 && !stop.has(t) && !/^\d+$/.test(t)),
    ),
  ].slice(0, 24);
}

/**
 * Build draft suggestions from card text (+ optional refine comment) against an entity index.
 * Reuses semantic extract/resolve; never invents entity UUIDs.
 */
export function buildKgDraftSuggestions(input: {
  canonicalCardId: string;
  canonicalCardVersionId: string;
  contentHash: string;
  cardOrdinal?: number;
  fields: Array<{ name: string; rawValue?: string; value?: string; plainText?: string }>;
  tags?: string[];
  entities: EntityIndexRow[];
  refineComment?: string;
  existingEntityIds?: string[];
}): KgDraftResult {
  const refine = (input.refineComment ?? "").trim().slice(0, 1000);
  const basePlain = plainFromFields(input.fields);
  const plain = refine ? `${basePlain}\n${refine}`.slice(0, 4500) : basePlain;
  const cardEvidence = analyzeKgCardEvidence(input.fields);
  const answers = cardEvidence.answerConcepts;
  const normalizedAnswers = answers.map(normalizeClinicalText);
  const existing = new Set(input.existingEntityIds ?? []);

  const card: EphemeralCard = {
    canonicalCardId: input.canonicalCardId,
    canonicalCardVersionId: input.canonicalCardVersionId,
    contentHash: input.contentHash,
    cardOrdinal: input.cardOrdinal ?? 0,
    tags: input.tags ?? [],
    fields: [
      {
        name: "Text",
        rawValue: plain,
        plainText: plain,
      },
    ],
  };

  const semantic = runSemanticCard(card, input.entities);
  const suggestions: KgDraftSuggestion[] = [];
  const seenEntity = new Set<string>();

  for (const r of semantic.resolutions) {
    if (r.disposition !== "selected" || !r.canonicalEntityId) continue;
    if (existing.has(r.canonicalEntityId) || seenEntity.has(r.canonicalEntityId)) continue;
    seenEntity.add(r.canonicalEntityId);
    const label =
      input.entities.find((e) => e.id === r.canonicalEntityId)?.preferredLabel ??
      r.normalizedConceptLabel;
    const answerMatch = normalizedAnswers.some((answer) =>
      phraseLoose(` ${answer} `, normalizeClinicalText(label)),
    );
    const role = (answerMatch ? "tests" : r.proposedMappingRole ?? "teaches") as MappingRole;
    suggestions.push({
      id: shortId(`link|${r.canonicalEntityId}|${input.canonicalCardVersionId}`),
      kind: "link_existing",
      confidence: r.resolutionConfidence,
      mappingRole: role,
      canonicalEntityId: r.canonicalEntityId,
      label,
      entityType: r.entityType ?? undefined,
      reasonCodes: [
        ...r.reasonCodes,
        answerMatch ? "cloze_answer_match" : "card_stem_match",
        ...(refine ? ["refine_comment"] : []),
      ],
      evidenceExcerpt: r.normalizedConceptLabel.slice(0, 120),
      defaultSelected: r.resolutionConfidence >= 0.9,
    });
  }

  // Substring fallback: entity label appears in card text but multi-word extract missed singles like "bone"
  const normPlain = ` ${normalizeClinicalText(plain)} `;
  for (const e of input.entities) {
    if (!e.active || existing.has(e.id) || seenEntity.has(e.id)) continue;
    const labels = [e.normalizedLabel, ...e.aliases, ...e.sourceAliases]
      .map(normalizeClinicalText)
      .filter((l) => l.length >= 4);
    const hit = labels.find((l) => phraseLoose(normPlain, l));
    if (!hit) continue;
    // Prefer multi-word or longer labels
    if (hit.length < 4) continue;
    seenEntity.add(e.id);
    const answerMatch = normalizedAnswers.some((answer) =>
      phraseLoose(` ${answer} `, hit),
    );
    suggestions.push({
      id: shortId(`sub|${e.id}|${input.canonicalCardVersionId}`),
      kind: "link_existing",
      confidence: hit.split(" ").length > 1 ? 0.88 : 0.78,
      mappingRole: answerMatch ? "tests" : "teaches",
      canonicalEntityId: e.id,
      label: e.preferredLabel,
      entityType: e.entityType,
      reasonCodes: [
        "substring_label_hit",
        answerMatch ? "cloze_answer_match" : "card_stem_match",
        ...(refine ? ["refine_comment"] : []),
      ],
      evidenceExcerpt: hit.slice(0, 120),
      defaultSelected: hit.split(" ").length > 1,
    });
    if (suggestions.filter((s) => s.kind === "link_existing").length >= 8) break;
  }

  // Retrieval failure is not evidence that the ontology is missing an entity.
  // New entities require a separate, explicit ontology-review workflow.
  const links = suggestions.filter((s) => s.kind === "link_existing");
  if (links.length === 0) {
    suggestions.push({
      id: shortId(`none|${input.canonicalCardVersionId}`),
      kind: "no_mapping",
      confidence: 0,
      mappingRole: "context_only",
      reasonCodes: [
        "no_reliable_existing_entity",
        ...(refine ? ["refine_comment_considered"] : []),
      ],
      evidenceExcerpt: plain.slice(0, 80),
      defaultSelected: false,
    });
  }

  // Cap and sort
  const capped = suggestions
    .sort((a, b) => b.confidence - a.confidence || a.id.localeCompare(b.id))
    .slice(0, 10);
  const resolvedAnswerIndexes = new Set<number>();
  for (const link of links) {
    const entity = input.entities.find((candidate) => candidate.id === link.canonicalEntityId);
    if (!entity) continue;
    const labels = [entity.normalizedLabel, ...entity.aliases, ...entity.sourceAliases]
      .map(normalizeClinicalText)
      .filter(Boolean);
    normalizedAnswers.forEach((answer, index) => {
      if (labels.some((label) => phraseLoose(` ${answer} `, label)))
        resolvedAnswerIndexes.add(index);
    });
  }

  return {
    contractVersion: KG_DRAFT_CONTRACT,
    algorithm: "lexical_semantic_v2",
    suggestions: capped,
    cardEvidence,
    ontologyGaps: answers
      .filter((_, index) => !resolvedAnswerIndexes.has(index))
      .slice(0, 8)
      .map((phrase) => ({
        phrase,
        suggestedAction: "review_missing_entity_or_alias" as const,
      })),
    cardPlainLength: plain.length,
    entityIndexSize: input.entities.length,
    refineCommentUsed: Boolean(refine),
  };
}

function phraseLoose(paddedText: string, phrase: string): boolean {
  if (phrase.length < 4) return false;
  return paddedText.includes(` ${phrase} `);
}

/** Map accepted drafts into workspace proposal mapping + expansion shapes. */
export function acceptedDraftsToProposalParts(accepted: KgDraftSuggestion[]): {
  mappingChanges: Array<{
    action: "add";
    canonicalEntityId: string | null;
    mappingRole: MappingRole;
    useExpansionSuggestion: boolean;
    rationale: string;
    confidence: number;
  }>;
  kgExpansionSuggestion: {
    suggestionType: "new_entity" | "new_alias";
    preferredLabel: string;
    entityType: string;
    description: string;
    existingEntityId: string | null;
    rationale: string;
  } | null;
} {
  const mappingChanges: ReturnType<typeof acceptedDraftsToProposalParts>["mappingChanges"] = [];
  let kgExpansionSuggestion: ReturnType<typeof acceptedDraftsToProposalParts>["kgExpansionSuggestion"] =
    null;

  for (const s of accepted) {
    if (s.kind === "link_existing" && s.canonicalEntityId) {
      mappingChanges.push({
        action: "add",
        canonicalEntityId: s.canonicalEntityId,
        mappingRole: s.mappingRole,
        useExpansionSuggestion: false,
        rationale: s.reasonCodes.join(",") || "reviewer_confirmed_draft",
        confidence: s.confidence,
      });
    } else if (s.kind === "new_entity" && s.preferredLabel) {
      // One expansion per proposal (schema limit); first wins
      if (!kgExpansionSuggestion) {
        kgExpansionSuggestion = {
          suggestionType: "new_entity",
          preferredLabel: s.preferredLabel,
          entityType: s.entityTypeProposed ?? "concept",
          description: s.description ?? s.preferredLabel,
          existingEntityId: null,
          rationale: s.reasonCodes.join(",") || "reviewer_confirmed_new_entity",
        };
        mappingChanges.push({
          action: "add",
          canonicalEntityId: null,
          mappingRole: s.mappingRole,
          useExpansionSuggestion: true,
          rationale: "uses_kg_expansion_suggestion",
          confidence: s.confidence,
        });
      }
    } else if (s.kind === "new_alias" && s.preferredLabel && s.existingEntityId) {
      if (!kgExpansionSuggestion) {
        kgExpansionSuggestion = {
          suggestionType: "new_alias",
          preferredLabel: s.preferredLabel,
          entityType: s.entityTypeProposed ?? "concept",
          description: s.description ?? s.preferredLabel,
          existingEntityId: s.existingEntityId,
          rationale: s.reasonCodes.join(",") || "reviewer_confirmed_alias",
        };
        mappingChanges.push({
          action: "add",
          canonicalEntityId: null,
          mappingRole: s.mappingRole,
          useExpansionSuggestion: true,
          rationale: "uses_kg_expansion_suggestion",
          confidence: s.confidence,
        });
      }
    }
  }

  return { mappingChanges, kgExpansionSuggestion };
}

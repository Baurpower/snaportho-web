import { createHash } from "node:crypto";

export const DECK_MANIFEST_CONTRACT_VERSION = "snaportho-deck-manifest.v1" as const;
export const CARD_ENTITY_RULES_VERSION = "card-entity-deterministic.v1" as const;
export const MAX_MANIFEST_ENTITY_IDS = 12;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256 = /^[0-9a-f]{64}$/i;
const SAFE_KEY = /^[A-Za-z0-9._:/-]{1,1000}$/;
const ANKI_GUID = /^[!-~]{1,200}$/;
function isSafeDisplayText(value: unknown, max: number): value is string { return typeof value === "string" && value.length > 0 && value.length <= max && !/[\u0000-\u001f\u007f]/.test(value); }
const FORBIDDEN = new Set(["stem", "question", "answer", "choices", "explanation", "image", "images", "rawhtml", "cardbody", "front", "back", "fieldtext"]);

export type DeckManifestCardV1 = {
  canonicalCardId: string; canonicalCardVersionId: string; noteGuid: string; cardOrdinal: number;
  nativeCardIdHint: string | null; contentHash: string; deckPath: string; orderingKey: string;
  inclusionStatus: "included" | "excluded" | "withdrawn"; canonicalEntityIds: string[]; metadata: Record<string, unknown>;
};
export type PublishedDeckManifestV1 = {
  contractVersion: typeof DECK_MANIFEST_CONTRACT_VERSION; releaseId: string; releaseKey: string;
  releaseVersion: string; releaseStatus: "draft" | "review" | "published" | "superseded" | "retired";
  manifestChecksum: string; minimumAddonVersion: string | null; cards: DeckManifestCardV1[]; metadata: Record<string, unknown>;
};

export type CardSignalInput = {
  canonicalCardId: string; canonicalCardVersionId: string; noteGuid: string | null; cardOrdinal: number;
  nativeCardIdHint: string | null; contentHash: string; deckPath: string; tags: string[]; fieldNames: string[];
  normalizedContentTokens: string[]; noteId: string; currentVersionId: string; active: boolean;
  curriculumMapped: boolean; existingCanonicalEntityIds: string[];
};
export type EntitySignalInput = {
  id: string; preferredLabel: string; normalizedLabel: string; entityType: string; aliases: string[];
  sourceAliases: string[]; active: boolean; lifecycleStatus: string;
};
export type VersionMappingCandidate = {
  candidateId: string; canonicalCardId: string; canonicalCardVersionId: string; canonicalEntityId: string;
  proposedMappingRole: "teaches" | "tests" | "explains" | "demonstrates" | "context_only";
  confidence: number; candidateMethod: string; signalTypes: string[]; evidenceHashes: string[];
  ambiguityFlags: string[]; competingCandidateIds: string[]; curriculumEvidenceContributed: boolean;
  lifecycleStatus: "needs_review"; reviewerDecision: ""; reviewerConfidence: ""; reviewerNotes: ""; reviewerIdentity: "";
};
export type CohortMetrics = {
  deckBranch: string; cardCount: number; uniqueNoteCount: number; curriculumMappedCount: number;
  canonicalLinkedCount: number; entityTypes: string[]; duplicateIdentityCount: number; missingIdentityCount: number;
  currentVersionErrorCount: number; ambiguousAliasCount: number; tagSignalCardCount: number;
};

export function sha256(value: string): string { return createHash("sha256").update(value).digest("hex"); }
export function deterministicUuid(value: string): string {
  const hash = sha256(value);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}
export function computeDeckManifestChecksum(cards: DeckManifestCardV1[]): string {
  return sha256([...cards].sort((a,b)=>a.orderingKey.localeCompare(b.orderingKey)).map((card)=>[
    card.canonicalCardId,card.canonicalCardVersionId,card.noteGuid,String(card.cardOrdinal),card.nativeCardIdHint??"",
    card.contentHash,card.deckPath,card.orderingKey,card.inclusionStatus,
  ].join("|")).join("\n"));
}
export function containsUnsafeMetadata(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(containsUnsafeMetadata);
  return Object.entries(value).some(([key, nested]) => FORBIDDEN.has(key.toLowerCase().replaceAll("_", "")) || containsUnsafeMetadata(nested));
}

export function validatePublishedDeckManifest(
  value: unknown,
  options: { requirePublished?: boolean; expectedVersionByCard?: Map<string, string>; approvedEntityIdsByCardVersion?: Map<string, Set<string>> } = {},
): string[] {
  const errors: string[] = [];
  if (!value || typeof value !== "object") return ["manifest_not_object"];
  const manifest = value as Record<string, unknown>;
  if (manifest.contractVersion !== DECK_MANIFEST_CONTRACT_VERSION) errors.push("unknown_contract_version");
  if (options.requirePublished && manifest.releaseStatus !== "published") errors.push("manifest_not_published");
  if (typeof manifest.releaseId !== "string" || !UUID.test(manifest.releaseId)) errors.push("invalid_release_id");
  if (typeof manifest.manifestChecksum !== "string" || !SHA256.test(manifest.manifestChecksum)) errors.push("invalid_manifest_checksum");
  if (containsUnsafeMetadata(manifest.metadata)) errors.push("unsafe_manifest_metadata");
  if (!Array.isArray(manifest.cards)) return [...errors, "cards_not_array"];
  const cards = new Set<string>(); const identities = new Set<string>();
  for (const [index, raw] of manifest.cards.entries()) {
    if (!raw || typeof raw !== "object") { errors.push(`card_${index}_not_object`); continue; }
    const card = raw as Record<string, unknown>; const cardId = String(card.canonicalCardId ?? "");
    const versionId = String(card.canonicalCardVersionId ?? ""); const identity = `${card.noteGuid}:${card.cardOrdinal}`;
    if (!UUID.test(cardId) || !UUID.test(versionId)) errors.push(`card_${index}_invalid_ids`);
    if (cards.has(cardId)) errors.push("duplicate_canonical_card"); cards.add(cardId);
    if (identities.has(identity)) errors.push("duplicate_guid_ordinal"); identities.add(identity);
    if (typeof card.noteGuid !== "string" || !ANKI_GUID.test(card.noteGuid) || !Number.isInteger(card.cardOrdinal) || (card.cardOrdinal as number) < 0) errors.push(`card_${index}_invalid_identity`);
    if (typeof card.contentHash !== "string" || !SHA256.test(card.contentHash)) errors.push(`card_${index}_missing_hash`);
    if (!isSafeDisplayText(card.deckPath,1000)) errors.push(`card_${index}_invalid_deck_path`);
    if (typeof card.orderingKey !== "string" || !SAFE_KEY.test(card.orderingKey)) errors.push(`card_${index}_invalid_ordering_key`);
    if (options.expectedVersionByCard?.get(cardId) !== undefined && options.expectedVersionByCard.get(cardId) !== versionId) errors.push(`card_${index}_version_mismatch`);
    if (!Array.isArray(card.canonicalEntityIds) || card.canonicalEntityIds.length > MAX_MANIFEST_ENTITY_IDS) errors.push(`card_${index}_entity_limit`);
    else for (const entityId of card.canonicalEntityIds) {
      if (typeof entityId !== "string" || !UUID.test(entityId)) errors.push(`card_${index}_invalid_entity`);
      if (!options.approvedEntityIdsByCardVersion?.get(versionId)?.has(String(entityId))) errors.push(`card_${index}_unapproved_entity`);
    }
    if (containsUnsafeMetadata(card.metadata)) errors.push(`card_${index}_unsafe_metadata`);
  }
  if (!errors.includes("cards_not_array") && manifest.cards.every((card)=>card && typeof card === "object")) {
    if (manifest.manifestChecksum !== computeDeckManifestChecksum(manifest.cards as DeckManifestCardV1[])) errors.push("manifest_checksum_mismatch");
  }
  return [...new Set(errors)];
}

export function selectRepresentativeCohort(metrics: CohortMetrics[]): { selected: CohortMetrics | null; ranked: Array<CohortMetrics & { score: number; exclusions: string[] }> } {
  const ranked = metrics.map((m) => {
    const exclusions: string[] = [];
    if (m.cardCount < 50 || m.cardCount > 200) exclusions.push("outside_50_200_cards");
    if (m.missingIdentityCount > 0) exclusions.push("missing_guid_or_ordinal");
    if (m.currentVersionErrorCount > 0) exclusions.push("current_version_integrity");
    const coverage = m.cardCount ? (m.curriculumMappedCount + m.canonicalLinkedCount * 2 + m.tagSignalCardCount) / m.cardCount : 0;
    const burden = m.cardCount + m.ambiguousAliasCount * 5 + m.duplicateIdentityCount * 20;
    const score = Math.round((m.entityTypes.length * 18 + coverage * 30 - burden / 12) * 1000) / 1000;
    return { ...m, score, exclusions };
  }).sort((a, b) => b.score - a.score || a.deckBranch.localeCompare(b.deckBranch));
  return { selected: ranked.find((row) => row.exclusions.length === 0) ?? null, ranked };
}

function normalize(value: string): string { return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
function tokenSet(values: string[]): Set<string> { return new Set(values.flatMap((v) => normalize(v).split(" ")).filter((v) => v.length > 2)); }
const AMBIGUOUS_ABBREVIATIONS = new Set(["acl", "pcl", "mcl", "lcl", "tha", "tka", "oa", "ct", "mri", "orif"]);

export function generateVersionMappingCandidates(cards: CardSignalInput[], entities: EntitySignalInput[]): VersionMappingCandidate[] {
  const aliasOwners = new Map<string, Set<string>>();
  for (const entity of entities) for (const alias of [entity.normalizedLabel, ...entity.aliases, ...entity.sourceAliases].map(normalize).filter(Boolean)) {
    const owners = aliasOwners.get(alias) ?? new Set<string>(); owners.add(entity.id); aliasOwners.set(alias, owners);
  }
  const candidates: VersionMappingCandidate[] = [];
  for (const card of [...cards].sort((a, b) => a.canonicalCardId.localeCompare(b.canonicalCardId))) {
    if (!card.active || card.currentVersionId !== card.canonicalCardVersionId || !card.noteGuid || card.cardOrdinal < 0) continue;
    const tagTokens = tokenSet(card.tags); const deckTokens = tokenSet([card.deckPath]); const contentTokens = new Set(card.normalizedContentTokens.map(normalize));
    const pending: Array<Omit<VersionMappingCandidate, "competingCandidateIds">> = [];
    for (const entity of entities) {
      if (!entity.active || ["deprecated", "replaced", "merged", "split"].includes(entity.lifecycleStatus)) continue;
      const labels = [...new Set([entity.normalizedLabel, ...entity.aliases, ...entity.sourceAliases].map(normalize).filter(Boolean))];
      let best = ""; let content = false; let tag = false; let deck = false; let ambiguous = false;
      for (const label of labels) {
        const parts = label.split(" ").filter(Boolean);
        const allContent = parts.length > 0 && parts.every((part) => contentTokens.has(part));
        const allTag = parts.length > 0 && parts.every((part) => tagTokens.has(part));
        const allDeck = parts.length > 0 && parts.every((part) => deckTokens.has(part));
        if (allContent || allTag || allDeck) {
          if (parts.length === 1 && !(allContent && allTag)) continue; // reject broad one-token/body-region matches.
          best = label; content ||= allContent; tag ||= allTag; deck ||= allDeck;
          ambiguous ||= aliasOwners.get(label)?.size !== 1 || (parts.length === 1 && AMBIGUOUS_ABBREVIATIONS.has(parts[0]));
        }
      }
      const signals = [content && "content_token", tag && "tag", deck && "deck_path", card.curriculumMapped && "curriculum_history", card.existingCanonicalEntityIds.includes(entity.id) && "direct_link_history"].filter(Boolean) as string[];
      const directSignalCount = Number(content) + Number(tag);
      if (!best || directSignalCount === 0) continue; // deck-only and curriculum-only never become candidates.
      if (!content && !(tag && (card.curriculumMapped || card.existingCanonicalEntityIds.includes(entity.id)))) continue; // reject unsupported tag-only matches.
      const ambiguityFlags = [ambiguous && "alias_collision_or_ambiguous_abbreviation", !content && tag && "tag_only", deck && !content && !tag && "deck_path_only"].filter(Boolean) as string[];
      const confidence = Math.min(0.99, 0.55 + Number(content) * 0.24 + Number(tag) * 0.14 + Number(deck) * 0.03 + Number(card.existingCanonicalEntityIds.includes(entity.id)) * 0.03 - Number(ambiguous) * 0.2);
      const candidateId = deterministicUuid(`${CARD_ENTITY_RULES_VERSION}|${card.canonicalCardVersionId}|${entity.id}|${signals.sort().join(",")}`);
      pending.push({ candidateId, canonicalCardId: card.canonicalCardId, canonicalCardVersionId: card.canonicalCardVersionId, canonicalEntityId: entity.id,
        proposedMappingRole: content ? "teaches" : "context_only", confidence: Math.round(confidence * 1000) / 1000,
        candidateMethod: content && tag ? "multi_signal" : content ? "exact_preferred_label" : "tag_and_deck", signalTypes: signals.sort(),
        evidenceHashes: [sha256(`${best}|${signals.sort().join("|")}`)], ambiguityFlags, curriculumEvidenceContributed: card.curriculumMapped,
        lifecycleStatus: "needs_review", reviewerDecision: "", reviewerConfidence: "", reviewerNotes: "", reviewerIdentity: "" });
    }
    const ids = pending.map((c) => c.candidateId).sort();
    for (const candidate of pending) candidates.push({ ...candidate, competingCandidateIds: ids.filter((id) => id !== candidate.candidateId) });
  }
  return candidates.sort((a, b) => a.canonicalCardId.localeCompare(b.canonicalCardId) || b.confidence - a.confidence || a.canonicalEntityId.localeCompare(b.canonicalEntityId));
}

export function detectStaleVersion(reviewedVersionId: string, currentVersionId: string): "current" | "stale" {
  return reviewedVersionId === currentVersionId ? "current" : "stale";
}

export function validateReviewRow(row: Record<string, string>, context: { currentVersionId: string; entityActive: boolean }): string[] {
  const errors: string[] = [];
  if (!row.reviewerIdentity) errors.push("reviewer_identity_required");
  if (!["approved", "rejected", "needs_changes"].includes(row.reviewerDecision)) errors.push("invalid_reviewer_decision");
  if (!["teaches", "tests", "explains", "demonstrates", "context_only", "broadly_related"].includes(row.mappingRole)) errors.push("invalid_mapping_role");
  const confidence = Number(row.reviewerConfidence); if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) errors.push("invalid_confidence");
  if (row.canonicalCardVersionId !== context.currentVersionId) errors.push("stale_card_version");
  if (!context.entityActive) errors.push("inactive_entity");
  if (row.reviewerDecision === "approved" && row.provenanceMethod !== "direct_human_review") errors.push("approval_requires_direct_human_review");
  return errors;
}

export function safeJson(value: unknown): string {
  if (containsUnsafeMetadata(value)) throw new Error("unsafe educational content in report payload");
  return `${JSON.stringify(value, null, 2)}\n`;
}

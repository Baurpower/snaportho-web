import { z } from "zod";
import {
  canonicalContentHash,
  stripNonClinicalMarkup,
  type EphemeralField,
} from "./deck-semantic-mapping.ts";

export const ANKI_INCORPORATION_CONTRACT =
  "snaportho-anki-incorporation-agent.v1" as const;

const personalField = /^(personal|user|local)(_|::)/i;
const installationField = /^SnapOrtho_(ID|Version|Installed_Hash)$/i;
const controlledTag = /^SnapOrtho::[A-Za-z0-9_:' -]+$/;
const mappingRoles = new Set([
  "teaches",
  "tests",
  "explains",
  "demonstrates",
  "context_only",
  "broadly_related",
]);

export type IncorporationProposal = {
  id: string;
  proposalEvidenceHash: string;
  proposalKind: "edit_existing_card" | "create_missing_card";
  canonicalCardId: string | null;
  baseVersionId: string | null;
  editedFields: Array<{ name: string; value: string }>;
  centralTagChanges: { add: string[]; remove: string[] };
  proposedDeckPath: string | null;
  mappingChanges: Array<{
    action: "add" | "remove" | "change_role";
    canonicalEntityId: string | null;
    mappingRole: string | null;
    useExpansionSuggestion?: boolean;
  }>;
  kgExpansionSuggestion: unknown | null;
};

export type IncorporationContext = {
  cardOrdinal: number;
  currentVersionId: string;
  currentFields: Array<Record<string, unknown> & { name: string }>;
  currentTags: string[];
  currentDeckPath: string;
  activeEntityIds: Set<string>;
};

export type IncorporationOperation =
  | { id: string; kind: "set_field"; name: string; value: string }
  | { id: string; kind: "add_tag"; tag: string }
  | { id: string; kind: "remove_tag"; tag: string }
  | { id: string; kind: "move_deck"; deckPath: string }
  | {
      id: string;
      kind: "change_mapping";
      action: "add" | "remove" | "change_role";
      canonicalEntityId: string;
      mappingRole: string | null;
    };

export type IncorporationCandidate = {
  contractVersion: typeof ANKI_INCORPORATION_CONTRACT;
  proposalId: string;
  proposalEvidenceHash: string;
  result: "ready" | "already_incorporated" | "needs_attention";
  operations: IncorporationOperation[];
  ignoredOperations: Array<{ reason: string; description: string }>;
  issues: string[];
  finalState: {
    fields: Array<Record<string, unknown> & { name: string }>;
    tags: string[];
    deckPath: string;
    contentHash: string;
  };
};

function operationId(kind: string, key: string): string {
  return `${kind}:${key}`;
}

function fieldValue(field: Record<string, unknown>): string {
  return String(field.rawValue ?? field.value ?? "");
}

function validResourceUrl(fieldName: string, value: string): boolean {
  if (!/(?:_Link|Link)$/i.test(fieldName) || !value.trim()) return true;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function buildIncorporationCandidate(
  proposal: IncorporationProposal,
  context: IncorporationContext,
): IncorporationCandidate {
  const issues: string[] = [];
  const ignoredOperations: IncorporationCandidate["ignoredOperations"] = [];
  const operations: IncorporationOperation[] = [];
  const fields = context.currentFields.map((field) => ({ ...field }));
  const byName = new Map(fields.map((field, index) => [field.name, index]));

  if (proposal.proposalKind !== "edit_existing_card")
    issues.push("new_card_requires_attention");
  if (
    !proposal.baseVersionId ||
    proposal.baseVersionId !== context.currentVersionId
  )
    issues.push("stale_card_version");
  if (proposal.kgExpansionSuggestion)
    issues.push("ontology_expansion_requires_attention");

  for (const edit of proposal.editedFields) {
    const name = edit.name.trim();
    const index = byName.get(name);
    if (personalField.test(name) || installationField.test(name)) {
      ignoredOperations.push({
        reason: "protected_field",
        description: `Ignored protected field ${name}.`,
      });
      continue;
    }
    if (index == null) {
      issues.push(`unknown_field:${name}`);
      continue;
    }
    if (!validResourceUrl(name, edit.value)) {
      issues.push(`invalid_url:${name}`);
      continue;
    }
    if (fieldValue(fields[index]!) === edit.value) {
      ignoredOperations.push({
        reason: "unchanged",
        description: `Ignored unchanged field ${name}.`,
      });
      continue;
    }
    fields[index] = {
      ...fields[index]!,
      rawValue: edit.value,
      value: edit.value,
      plainText: stripNonClinicalMarkup(edit.value),
    };
    operations.push({
      id: operationId("field", name),
      kind: "set_field",
      name,
      value: edit.value,
    });
  }

  const tags = new Set(context.currentTags);
  for (const tag of proposal.centralTagChanges.add) {
    if (!controlledTag.test(tag)) {
      issues.push(`invalid_central_tag:${tag}`);
      continue;
    }
    if (tags.has(tag)) {
      ignoredOperations.push({
        reason: "unchanged",
        description: `Ignored existing tag ${tag}.`,
      });
      continue;
    }
    tags.add(tag);
    operations.push({ id: operationId("tag-add", tag), kind: "add_tag", tag });
  }
  for (const tag of proposal.centralTagChanges.remove) {
    if (!controlledTag.test(tag)) {
      ignoredOperations.push({
        reason: "unmanaged_tag",
        description: `Ignored removal outside the governed namespace: ${tag}.`,
      });
      continue;
    }
    if (!tags.delete(tag)) {
      ignoredOperations.push({
        reason: "unchanged",
        description: `Ignored absent tag ${tag}.`,
      });
      continue;
    }
    operations.push({
      id: operationId("tag-remove", tag),
      kind: "remove_tag",
      tag,
    });
  }

  let deckPath = context.currentDeckPath;
  if (
    proposal.proposedDeckPath &&
    proposal.proposedDeckPath !== context.currentDeckPath
  ) {
    if (!proposal.proposedDeckPath.startsWith("SnapOrtho::"))
      issues.push("invalid_central_deck_path");
    else {
      deckPath = proposal.proposedDeckPath;
      operations.push({
        id: operationId("deck", proposal.proposedDeckPath),
        kind: "move_deck",
        deckPath,
      });
    }
  }

  for (const mapping of proposal.mappingChanges) {
    const entityId = mapping.canonicalEntityId;
    if (mapping.useExpansionSuggestion || !entityId) {
      issues.push("ontology_expansion_requires_attention");
      continue;
    }
    if (!context.activeEntityIds.has(entityId)) {
      issues.push(`inactive_mapping_entity:${entityId}`);
      continue;
    }
    if (
      mapping.action !== "remove" &&
      (!mapping.mappingRole || !mappingRoles.has(mapping.mappingRole))
    ) {
      issues.push(`invalid_mapping_role:${entityId}`);
      continue;
    }
    operations.push({
      id: operationId("mapping", `${mapping.action}:${entityId}`),
      kind: "change_mapping",
      action: mapping.action,
      canonicalEntityId: entityId,
      mappingRole: mapping.mappingRole,
    });
  }

  const finalTags = [...tags];
  const contentHash = canonicalContentHash({
    fields: fields.map((field) => ({
      name: field.name,
      rawValue: fieldValue(field),
      plainText:
        typeof field.plainText === "string" ? field.plainText : undefined,
    })) as EphemeralField[],
    tags: finalTags,
    cardOrdinal: context.cardOrdinal,
  });
  return {
    contractVersion: ANKI_INCORPORATION_CONTRACT,
    proposalId: proposal.id,
    proposalEvidenceHash: proposal.proposalEvidenceHash,
    result: issues.length
      ? "needs_attention"
      : operations.length
        ? "ready"
        : "already_incorporated",
    operations,
    ignoredOperations,
    issues: [...new Set(issues)],
    finalState: { fields, tags: finalTags, deckPath, contentHash },
  };
}

export const incorporationAgentPlanSchema = z
  .object({
    contractVersion: z.literal(ANKI_INCORPORATION_CONTRACT),
    proposalId: z.string().uuid(),
    proposalEvidenceHash: z.string().regex(/^[a-f0-9]{64}$/),
    result: z.enum([
      "incorporate",
      "needs_attention",
      "already_incorporated",
    ]),
    acceptedOperationIds: z.array(z.string().min(1).max(500)).max(100),
    ignoredOperationIds: z.array(z.string().min(1).max(500)).max(100),
    issues: z.array(z.string().min(1).max(500)).max(50),
  })
  .strict();

export type IncorporationAgentPlan = z.infer<
  typeof incorporationAgentPlanSchema
>;

export function validateAgentPlan(
  candidate: IncorporationCandidate,
  plan: IncorporationAgentPlan,
): string[] {
  const errors: string[] = [];
  if (plan.proposalId !== candidate.proposalId) errors.push("proposal_mismatch");
  if (plan.proposalEvidenceHash !== candidate.proposalEvidenceHash)
    errors.push("evidence_hash_mismatch");
  const allowed = new Set(candidate.operations.map((operation) => operation.id));
  if (plan.acceptedOperationIds.some((id) => !allowed.has(id)))
    errors.push("unknown_operation");
  if (
    plan.result === "incorporate" &&
    (candidate.result !== "ready" ||
      plan.acceptedOperationIds.length !== candidate.operations.length ||
      candidate.operations.some(
        (operation) => !plan.acceptedOperationIds.includes(operation.id),
      ))
  )
    errors.push("partial_or_unsafe_incorporation");
  if (
    candidate.result === "needs_attention" &&
    plan.result !== "needs_attention"
  )
    errors.push("required_attention_not_preserved");
  return [...new Set(errors)];
}

export const INCORPORATION_AGENT_INSTRUCTIONS = `You are the SnapOrtho incorporation agent. A qualified human already reviewed and submitted the proposal. Do not perform a second editorial approval.

Review the normalized candidate only. If candidate.result is ready, accept every listed operation unless a concrete technical contradiction is visible. Never add, rewrite, or invent operations. If candidate.result is needs_attention, preserve that result and its issues. If it is already_incorporated, return already_incorporated.

Unchanged fields, protected installation metadata, duplicates, and unmanaged tag removals are intentional no-ops. A null proposed deck path means preserve the current deck. New cards, unresolved entities, and ontology expansion must remain needs_attention.

Return only JSON matching the supplied contract. Never emit SQL and never access production directly.`;

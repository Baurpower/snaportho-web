/** Review-driven promotion application (Steps 11-15, 22).
 *
 * Consumes a reviewed decision file and produces a transactional, idempotent
 * apply plan. Default mode is dry-run; apply mode requires an explicit flag
 * plus a live database (see scripts/kg-entity-promotion-apply.ts).
 *
 * Fail-closed rules:
 * - PROMOTE re-checks exact, plural-folded, and alias matches against the
 *   FULL canonical index at plan time. A newly visible canonical converts
 *   the decision to NEEDS_REREVIEW — the applier never auto-aliases and
 *   never duplicates.
 * - ALIAS requires the target to exist and the alias to be unclaimed by a
 *   different canonical. Conflicts are plan errors, not silent merges. An
 *   alias folding into a different canonical's label is NEEDS_REREVIEW.
 * - Bare joint-ambiguous acronyms (MCL/LCL/UCL) may only target
 *   joint-unspecified canonicals; joint-qualified targets are plan errors.
 * - MERGE requires the head proposal to exist and be unresolved.
 * - Every decision carries an idempotency key; applied keys are skipped.
 * - History is never deleted: edge repoints insert a new canonical edge and
 *   deactivate the proposed edge with provenance metadata.
 */

import { isCanonicalEntityType, isEntityDisposition } from "./entity-review-dispositions";
import { dedupKeyForLabel, looksLikeAcronym, tokenContainment, trigramSimilarity } from "./entity-label-normalization";
import { JOINT_DISAMBIGUATORS } from "./review-packet";

export const PROMOTION_APPLIER_VERSION = "promotion-applier.v1" as const;

/** Bare acronyms proven joint-dependent in live claim context (Step 3):
 * LCL primaries span elbow + knee; MCL's only primary is elbow while knee
 * claims exist in-corpus; UCL primaries span elbow + thumb. Never universal. */
const JOINT_AMBIGUOUS_ACRONYMS: ReadonlySet<string> = new Set(["mcl", "lcl", "ucl"]);

export type ReviewDecisionInput = {
  decisionKey?: string;
  offlineProposalId?: string;
  kgProposalId?: string;
  proposalLabel: string;
  proposalNormalizedLabel: string;
  proposedEntityType: string;
  sourceClaimIds: string[];
  decision: string;
  canonicalEntityId?: string;
  mergeHeadProposalId?: string;
  canonicalLabel?: string;
  entityType?: string;
  aliasType?: string;
  reviewer: string;
  reason: string;
  confidence?: number;
};

export type CanonicalPlanRef = {
  id: string;
  normalizedLabel: string;
  entityType: string;
};

export type AliasPlanRef = {
  normalizedAlias: string;
  canonicalEntityId: string;
  isActive: boolean;
};

export type KgProposalPlanRef = {
  id: string;
  reviewStatus: string;
  proposalType: string;
  supersededBy?: string | null;
};

export type EdgePlanRef = {
  claimId: string;
  role: string;
  entityKind: string;
  canonicalEntityId?: string | null;
  proposalId?: string | null;
};

export type ApplyContext = {
  canonicalById: Map<string, CanonicalPlanRef>;
  canonicalByNormalized: Map<string, CanonicalPlanRef[]>;
  aliases: AliasPlanRef[];
  kgProposals: Map<string, KgProposalPlanRef>;
  appliedDecisionKeys: Set<string>;
  edges: EdgePlanRef[];
};

export type PlanOperation =
  | { kind: "create_canonical_entity"; decisionKey: string; label: string; normalizedLabel: string; entityType: string; slug: string }
  | { kind: "add_entity_alias"; decisionKey: string; canonicalEntityId: string; aliasName: string; normalizedAlias: string; aliasType: string }
  | { kind: "repoint_edges_to_canonical"; decisionKey: string; fromProposalKey: string; canonicalEntityId: string; edgeCount: number }
  | { kind: "merge_proposal"; decisionKey: string; memberProposalKey: string; headProposalKey: string; edgeCount: number }
  | { kind: "reject_proposal"; decisionKey: string; proposalKey: string; reason: string }
  | { kind: "defer_proposal"; decisionKey: string; proposalKey: string }
  | { kind: "record_decision"; decisionKey: string; decision: string }
  | { kind: "needs_rereview"; decisionKey: string; reason: string };

export type ApplyPlan = {
  version: string;
  dryRun: boolean;
  operations: PlanOperation[];
  errors: Array<{ decisionKey: string; code: string; detail: string }>;
  warnings: Array<{ decisionKey: string; code: string; detail: string }>;
  stats: Record<string, number>;
};

export function decisionKeyFor(input: ReviewDecisionInput): string {
  if (input.decisionKey) return input.decisionKey;
  const target = input.canonicalEntityId ?? input.mergeHeadProposalId ?? input.canonicalLabel ?? "";
  return `phase3|${input.proposalNormalizedLabel}|${input.proposedEntityType}|${input.decision}|${target}`;
}

/** Infer the alias type for a reviewed ALIAS_EXISTING decision. The reviewer
 * may override via input.aliasType; this default keeps the common cases
 * (acronyms, elided forms, spelling variants) correctly typed. */
export function inferAliasType(proposalLabel: string, canonicalLabel: string): string {
  if (looksLikeAcronym(proposalLabel)) return "acronym";
  const proposal = proposalLabel.trim().toLowerCase().replace(/\s+/g, " ");
  const canonical = canonicalLabel.trim().toLowerCase().replace(/\s+/g, " ");
  if (!proposal.includes(" ") && canonical.split(" ").includes(proposal)) return "elided_form";
  if (proposal !== canonical && dedupKeyForLabel(proposal) === dedupKeyForLabel(canonical)) return "plural_variant";
  if (trigramSimilarity(proposal, canonical) >= 0.8 && tokenContainment(proposal, canonical) === 1) {
    return "alternate_spelling";
  }
  return "synonym";
}

export function slugifyLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export function validateDecisions(decisions: ReviewDecisionInput[]): Array<{ index: number; code: string; detail: string }> {
  const errors: Array<{ index: number; code: string; detail: string }> = [];
  const seen = new Set<string>();
  decisions.forEach((input, index) => {
    const key = decisionKeyFor(input);
    if (seen.has(key)) {
      errors.push({ index, code: "duplicate_decision_key", detail: key });
    }
    seen.add(key);
    if (!isEntityDisposition(input.decision)) {
      errors.push({ index, code: "unknown_decision", detail: input.decision });
      return;
    }
    if (!input.reviewer || !input.reason) {
      errors.push({ index, code: "missing_reviewer_or_reason", detail: key });
    }
    if (!input.proposalLabel || !input.proposalNormalizedLabel) {
      errors.push({ index, code: "missing_proposal_label", detail: key });
    }
    if (input.decision === "ALIAS_EXISTING" && !input.canonicalEntityId) {
      errors.push({ index, code: "alias_missing_target", detail: key });
    }
    if (input.decision === "MERGE_PROPOSALS" && !input.mergeHeadProposalId) {
      errors.push({ index, code: "merge_missing_head", detail: key });
    }
    if (input.decision === "PROMOTE_CANONICAL") {
      if (!input.canonicalLabel || !input.entityType) {
        errors.push({ index, code: "promote_missing_label_or_type", detail: key });
      } else if (!isCanonicalEntityType(input.entityType)) {
        errors.push({ index, code: "promote_invalid_type", detail: `${key}: ${input.entityType}` });
      }
    }
  });
  return errors;
}

function countProposalEdges(edges: EdgePlanRef[], proposalKey: string): number {
  return edges.filter((edge) => edge.entityKind === "proposed" && edge.proposalId === proposalKey).length;
}

export function planApply(
  decisions: ReviewDecisionInput[],
  context: ApplyContext,
  dryRun = true,
): ApplyPlan {
  const operations: PlanOperation[] = [];
  const errors: ApplyPlan["errors"] = [];
  const warnings: ApplyPlan["warnings"] = [];
  const stats: Record<string, number> = {};
  const bump = (name: string): void => {
    stats[name] = (stats[name] ?? 0) + 1;
  };
  // Plural-folded secondary index over the full canonical set (Step 2):
  // catches singular/plural duplicates the exact check cannot see.
  const canonicalByFolded = new Map<string, CanonicalPlanRef[]>();
  for (const entries of context.canonicalByNormalized.values()) {
    for (const entry of entries) {
      const folded = dedupKeyForLabel(entry.normalizedLabel);
      const list = canonicalByFolded.get(folded) ?? [];
      list.push(entry);
      canonicalByFolded.set(folded, list);
    }
  }

  for (const input of decisions) {
    const key = decisionKeyFor(input);
    if (context.appliedDecisionKeys.has(key)) {
      warnings.push({ decisionKey: key, code: "already_applied", detail: "skipped; idempotent replay" });
      bump("skipped_applied");
      continue;
    }
    const proposalKey = input.kgProposalId ?? input.offlineProposalId ?? key;
    switch (input.decision) {
      case "PROMOTE_CANONICAL": {
        const normalized = input.canonicalLabel!.trim().toLowerCase().replace(/\s+/g, " ");
        const existing = context.canonicalByNormalized.get(normalized) ?? [];
        if (existing.length > 0) {
          // Fail closed: the full index reveals a canonical the offline run
          // could not see. The reviewer must re-decide (alias vs distinct).
          operations.push({ kind: "needs_rereview", decisionKey: key, reason: `canonical_exists:${existing[0].id}` });
          warnings.push({ decisionKey: key, code: "promote_blocked_by_existing_canonical", detail: existing.map((entry) => entry.id).join(",") });
          bump("needs_rereview");
          break;
        }
        const folded = dedupKeyForLabel(normalized);
        const foldedExisting = (canonicalByFolded.get(folded) ?? []).filter((entry) => entry.normalizedLabel !== normalized);
        if (foldedExisting.length > 0) {
          // Fail closed on inflection duplicates: singular/plural twins
          // (Femoral Shaft Fracture/Fractures) must merge, never double-promote.
          operations.push({ kind: "needs_rereview", decisionKey: key, reason: `canonical_folded_exists:${foldedExisting[0].id}` });
          warnings.push({ decisionKey: key, code: "promote_blocked_by_folded_canonical", detail: foldedExisting.map((entry) => entry.id).join(",") });
          bump("needs_rereview");
          break;
        }
        const aliasConflict = context.aliases.find(
          (alias) => alias.isActive && alias.normalizedAlias === normalized,
        );
        if (aliasConflict) {
          operations.push({ kind: "needs_rereview", decisionKey: key, reason: `alias_claimed_by:${aliasConflict.canonicalEntityId}` });
          warnings.push({ decisionKey: key, code: "promote_blocked_by_claimed_alias", detail: aliasConflict.canonicalEntityId });
          bump("needs_rereview");
          break;
        }
        const foldedAliasConflict = context.aliases.find(
          (alias) => alias.isActive && alias.normalizedAlias !== normalized && dedupKeyForLabel(alias.normalizedAlias) === folded,
        );
        if (foldedAliasConflict) {
          operations.push({ kind: "needs_rereview", decisionKey: key, reason: `alias_folded_claimed_by:${foldedAliasConflict.canonicalEntityId}` });
          warnings.push({ decisionKey: key, code: "promote_blocked_by_folded_alias", detail: foldedAliasConflict.canonicalEntityId });
          bump("needs_rereview");
          break;
        }
        operations.push({
          kind: "create_canonical_entity",
          decisionKey: key,
          label: input.canonicalLabel!,
          normalizedLabel: normalized,
          entityType: input.entityType!,
          slug: slugifyLabel(input.canonicalLabel!),
        });
        operations.push({
          kind: "repoint_edges_to_canonical",
          decisionKey: key,
          fromProposalKey: proposalKey,
          canonicalEntityId: `new:${key}`,
          edgeCount: countProposalEdges(context.edges, proposalKey),
        });
        operations.push({ kind: "record_decision", decisionKey: key, decision: input.decision });
        bump("promote");
        break;
      }
      case "ALIAS_EXISTING": {
        const target = context.canonicalById.get(input.canonicalEntityId!);
        if (!target) {
          errors.push({ decisionKey: key, code: "alias_target_missing", detail: input.canonicalEntityId! });
          bump("error");
          break;
        }
        const normalized = input.proposalNormalizedLabel;
        const conflict = context.aliases.find(
          (alias) => alias.isActive
            && alias.normalizedAlias === normalized
            && alias.canonicalEntityId !== target.id,
        );
        if (conflict) {
          errors.push({ decisionKey: key, code: "alias_conflict", detail: `claimed by ${conflict.canonicalEntityId}` });
          bump("error");
          break;
        }
        // Fail closed: an alias whose folded form equals a DIFFERENT
        // canonical's folded label would split singular/plural across
        // canonicals (the exact disease the governance backlog cleans up).
        const foldedAlias = dedupKeyForLabel(normalized);
        const foldedTwin = [...context.canonicalById.values()].find(
          (entry) => entry.id !== target.id && dedupKeyForLabel(entry.normalizedLabel) === foldedAlias,
        );
        if (foldedTwin) {
          operations.push({ kind: "needs_rereview", decisionKey: key, reason: `alias_folds_into_canonical:${foldedTwin.id}` });
          warnings.push({ decisionKey: key, code: "alias_blocked_by_folded_canonical", detail: foldedTwin.id });
          bump("needs_rereview");
          break;
        }
        // Step 3 ruling (joint-dependent acronyms): a bare MCL/LCL/UCL alias
        // may only target a joint-unspecified canonical. Targeting a
        // joint-qualified canonical silently misresolves every other joint's
        // claims, so it is a plan error, not a re-review.
        const bareAlias = dedupKeyForLabel(normalized);
        if (!bareAlias.includes(" ") && JOINT_AMBIGUOUS_ACRONYMS.has(bareAlias)) {
          const targetTokens = new Set(target.normalizedLabel.split(" "));
          if (JOINT_DISAMBIGUATORS.some((joint) => targetTokens.has(joint))) {
            errors.push({ decisionKey: key, code: "alias_joint_ambiguous", detail: `${normalized} -> ${target.normalizedLabel}` });
            bump("error");
            break;
          }
        }
        operations.push({
          kind: "add_entity_alias",
          decisionKey: key,
          canonicalEntityId: target.id,
          aliasName: input.proposalLabel,
          normalizedAlias: normalized,
          aliasType: input.aliasType ?? inferAliasType(input.proposalLabel, target.normalizedLabel),
        });
        operations.push({
          kind: "repoint_edges_to_canonical",
          decisionKey: key,
          fromProposalKey: proposalKey,
          canonicalEntityId: target.id,
          edgeCount: countProposalEdges(context.edges, proposalKey),
        });
        operations.push({ kind: "record_decision", decisionKey: key, decision: input.decision });
        bump("alias");
        break;
      }
      case "MERGE_PROPOSALS": {
        const head = context.kgProposals.get(input.mergeHeadProposalId!);
        if (!head) {
          errors.push({ decisionKey: key, code: "merge_head_missing", detail: input.mergeHeadProposalId! });
          bump("error");
          break;
        }
        if (head.reviewStatus === "rejected" || head.supersededBy) {
          errors.push({ decisionKey: key, code: "merge_head_resolved", detail: input.mergeHeadProposalId! });
          bump("error");
          break;
        }
        operations.push({
          kind: "merge_proposal",
          decisionKey: key,
          memberProposalKey: proposalKey,
          headProposalKey: input.mergeHeadProposalId!,
          edgeCount: countProposalEdges(context.edges, proposalKey),
        });
        operations.push({ kind: "record_decision", decisionKey: key, decision: input.decision });
        bump("merge");
        break;
      }
      case "REJECT_NON_ENTITY":
      case "REJECT_TOO_GENERIC":
      case "REJECT_CONTEXT_DEPENDENT":
      case "REJECT_DUPLICATE": {
        operations.push({ kind: "reject_proposal", decisionKey: key, proposalKey, reason: input.reason });
        operations.push({ kind: "record_decision", decisionKey: key, decision: input.decision });
        bump("reject");
        break;
      }
      case "DEFER_NEEDS_REVIEW": {
        operations.push({ kind: "defer_proposal", decisionKey: key, proposalKey });
        operations.push({ kind: "record_decision", decisionKey: key, decision: input.decision });
        bump("defer");
        break;
      }
      default: {
        errors.push({ decisionKey: key, code: "unknown_decision", detail: input.decision });
        bump("error");
      }
    }
  }
  return { version: PROMOTION_APPLIER_VERSION, dryRun, operations, errors, warnings, stats };
}

function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

/** Render the plan as one transaction of idempotent statements for audit.
 * Drivers execute via parameterized queries; this text form is for review. */
export function renderApplySql(plan: ApplyPlan, decisions: ReviewDecisionInput[]): string {
  const byKey = new Map(decisions.map((input) => [decisionKeyFor(input), input]));
  const lines: string[] = [
    `-- promotion apply plan ${plan.version} (dry_run=${plan.dryRun ? "on" : "off"})`,
    `-- operations=${plan.operations.length} errors=${plan.errors.length}`,
    "begin;",
  ];
  for (const operation of plan.operations) {
    const input = byKey.get(operation.decisionKey);
    if (!input) continue;
    switch (operation.kind) {
      case "create_canonical_entity": {
        lines.push(
          `insert into public.canonical_entities (entity_type, preferred_label, normalized_label, slug, status, review_status, metadata, comments, is_active)`,
          `select ${sqlString(operation.entityType)}, ${sqlString(operation.label)}, ${sqlString(operation.normalizedLabel)}, ${sqlString(operation.slug)}, 'reviewed', 'approved', ${sqlString(JSON.stringify({ created_from_decision_key: operation.decisionKey }))}::jsonb, 'Promoted from reviewed Phase 3 decision.', true`,
          `where not exists (select 1 from public.canonical_entities where normalized_label = ${sqlString(operation.normalizedLabel)});`,
        );
        break;
      }
      case "add_entity_alias": {
        lines.push(
          `insert into public.canonical_entity_aliases (canonical_entity_id, alias_name, normalized_alias, alias_type, review_status, reviewed_by, comments, is_active)`,
          `select ${sqlString(operation.canonicalEntityId)}::uuid, ${sqlString(operation.aliasName)}, ${sqlString(operation.normalizedAlias)}, ${sqlString(operation.aliasType)}, 'approved', ${sqlString(input.reviewer)}, 'Reviewed Phase 3 alias.', true`,
          `where not exists (select 1 from public.canonical_entity_aliases where canonical_entity_id = ${sqlString(operation.canonicalEntityId)}::uuid and normalized_alias = ${sqlString(operation.normalizedAlias)} and is_active);`,
        );
        break;
      }
      case "repoint_edges_to_canonical": {
        lines.push(
          `-- repoint ${operation.edgeCount} edge(s) from proposal ${operation.fromProposalKey} to ${operation.canonicalEntityId} (insert canonical edge, deactivate proposed edge)`,
        );
        break;
      }
      case "merge_proposal": {
        lines.push(
          `update public.kg_automation_proposals set superseded_by = ${sqlString(operation.headProposalKey)}::uuid, review_status = 'superseded', reviewer_notes = ${sqlString(input.reason)}, updated_at = now() where id = ${sqlString(operation.memberProposalKey)}::uuid and superseded_by is null;`,
        );
        break;
      }
      case "reject_proposal": {
        lines.push(
          `update public.kg_automation_proposals set review_status = 'rejected', reviewer_notes = ${sqlString(input.reason)}, reviewed_at = now(), updated_at = now() where id = ${sqlString(operation.proposalKey)}::uuid;`,
        );
        break;
      }
      case "defer_proposal": {
        lines.push(
          `update public.kg_automation_proposals set review_status = 'in_review', reviewer_notes = ${sqlString(input.reason)}, updated_at = now() where id = ${sqlString(operation.proposalKey)}::uuid;`,
        );
        break;
      }
      case "record_decision": {
        lines.push(
          `insert into public.entity_review_decisions (decision_key, proposal_label, proposal_normalized_label, proposed_entity_type, decision, reviewer, reason, confidence, needs_full_db_recheck)`,
          `select ${sqlString(operation.decisionKey)}, ${sqlString(input.proposalLabel)}, ${sqlString(input.proposalNormalizedLabel)}, ${sqlString(input.proposedEntityType)}, ${sqlString(operation.decision)}, ${sqlString(input.reviewer)}, ${sqlString(input.reason)}, ${input.confidence ?? 0}, false`,
          `on conflict (decision_key) do nothing;`,
        );
        break;
      }
      case "needs_rereview": {
        lines.push(`-- DECISION ${operation.decisionKey} NEEDS REREVIEW: ${operation.reason}`);
        break;
      }
    }
  }
  lines.push("commit;");
  return `${lines.join("\n")}\n`;
}

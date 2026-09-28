/** Live apply executor for reviewed promotion decisions.
 *
 * The database client is injected so the full execute path is testable with
 * an in-memory fake. Live mode uses the Supabase service client (see the CLI)
 * and follows the existing apply-script conventions: per-decision idempotent
 * writes, skip-and-report on invalid input, decision log recorded only after
 * the decision's own operations succeed (restart replays safely).
 */

import { decisionKeyFor, planApply, type ApplyContext, type PlanOperation, type ReviewDecisionInput } from "./promotion-applier";

export type PromotionDb = {
  fetchCanonical: () => Promise<Array<{ id: string; normalizedLabel: string; entityType: string }>>;
  fetchAliases: () => Promise<Array<{ normalizedAlias: string; canonicalEntityId: string; isActive: boolean }>>;
  fetchKgProposals: (ids: string[]) => Promise<Array<{ id: string; reviewStatus: string; proposalType: string; supersededBy?: string | null }>>;
  fetchAppliedDecisionKeys: () => Promise<string[]>;
  fetchProposalEdges: (proposalIds: string[]) => Promise<Array<{ claimId: string; role: string; entityKind: string; canonicalEntityId?: string | null; proposalId?: string | null }>>;
  insertCanonicalEntity: (input: { label: string; normalizedLabel: string; entityType: string; slug: string; decisionKey: string; reviewer: string }) => Promise<string>;
  insertAlias: (input: { canonicalEntityId: string; aliasName: string; normalizedAlias: string; aliasType: string; reviewer: string; decisionKey: string }) => Promise<void>;
  repointEdges: (input: { fromProposalKey: string; canonicalEntityId: string; decisionKey: string }) => Promise<number>;
  mergeProposal: (input: { memberProposalKey: string; headProposalKey: string; reason: string }) => Promise<void>;
  setProposalReview: (input: { proposalKey: string; reviewStatus: string; reason: string }) => Promise<void>;
  recordDecision: (input: ReviewDecisionInput & { decisionKey: string }) => Promise<void>;
  markDecisionApplied: (decisionKey: string, appliedBy: string) => Promise<void>;
};

export type ExecuteReport = {
  version: string;
  decisions: number;
  executed: number;
  skipped: number;
  errors: Array<{ decisionKey: string; code: string; detail: string }>;
  mutations: Record<string, number>;
};

export async function buildLiveContext(db: PromotionDb, decisions: ReviewDecisionInput[]): Promise<ApplyContext> {
  const [canonical, aliases, appliedKeys] = await Promise.all([
    db.fetchCanonical(),
    db.fetchAliases(),
    db.fetchAppliedDecisionKeys(),
  ]);
  const proposalIds = [...new Set(decisions.flatMap((input) => [input.kgProposalId, input.mergeHeadProposalId]).filter((id): id is string => Boolean(id)))];
  const [kgProposals, edges] = await Promise.all([
    db.fetchKgProposals(proposalIds),
    db.fetchProposalEdges(proposalIds),
  ]);
  const canonicalById = new Map(canonical.map((entry) => [entry.id, entry]));
  const canonicalByNormalized = new Map<string, Array<{ id: string; normalizedLabel: string; entityType: string }>>();
  for (const entry of canonical) {
    const list = canonicalByNormalized.get(entry.normalizedLabel) ?? [];
    list.push(entry);
    canonicalByNormalized.set(entry.normalizedLabel, list);
  }
  return {
    canonicalById,
    canonicalByNormalized,
    aliases,
    kgProposals: new Map(kgProposals.map((entry) => [entry.id, entry])),
    appliedDecisionKeys: new Set(appliedKeys),
    edges,
  };
}

export async function executePlan(
  db: PromotionDb,
  decisions: ReviewDecisionInput[],
  appliedBy: string,
): Promise<ExecuteReport> {
  const context = await buildLiveContext(db, decisions);
  const plan = planApply(decisions, context, false);
  const byKey = new Map(decisions.map((input) => [decisionKeyFor(input), input]));
  const report: ExecuteReport = { version: plan.version, decisions: decisions.length, executed: 0, skipped: 0, errors: [...plan.errors], mutations: {} };
  const bump = (name: string, by = 1): void => {
    report.mutations[name] = (report.mutations[name] ?? 0) + by;
  };
  if (plan.errors.length > 0) return report;
  const newEntityIds = new Map<string, string>();
  const opsByDecision = new Map<string, PlanOperation[]>();
  for (const operation of plan.operations) {
    const list = opsByDecision.get(operation.decisionKey) ?? [];
    list.push(operation);
    opsByDecision.set(operation.decisionKey, list);
  }
  for (const [decisionKey, operations] of opsByDecision) {
    const input = byKey.get(decisionKey);
    if (!input) {
      report.errors.push({ decisionKey, code: "decision_input_missing", detail: decisionKey });
      continue;
    }
    if (operations.some((operation) => operation.kind === "needs_rereview")) {
      report.skipped += 1;
      continue;
    }
    try {
      for (const operation of operations) {
        switch (operation.kind) {
          case "create_canonical_entity": {
            const id = await db.insertCanonicalEntity({
              label: operation.label,
              normalizedLabel: operation.normalizedLabel,
              entityType: operation.entityType,
              slug: operation.slug,
              decisionKey,
              reviewer: input.reviewer,
            });
            newEntityIds.set(decisionKey, id);
            bump("canonical_entities");
            break;
          }
          case "add_entity_alias": {
            await db.insertAlias({
              canonicalEntityId: operation.canonicalEntityId,
              aliasName: operation.aliasName,
              normalizedAlias: operation.normalizedAlias,
              aliasType: operation.aliasType,
              reviewer: input.reviewer,
              decisionKey,
            });
            bump("canonical_entity_aliases");
            break;
          }
          case "repoint_edges_to_canonical": {
            const target = operation.canonicalEntityId.startsWith("new:")
              ? newEntityIds.get(decisionKey)
              : operation.canonicalEntityId;
            if (!target) throw new Error(`missing created entity for ${decisionKey}`);
            const count = await db.repointEdges({ fromProposalKey: operation.fromProposalKey, canonicalEntityId: target, decisionKey });
            bump("claim_edges_repointed", count);
            break;
          }
          case "merge_proposal": {
            await db.mergeProposal({ memberProposalKey: operation.memberProposalKey, headProposalKey: operation.headProposalKey, reason: input.reason });
            bump("proposals_merged");
            break;
          }
          case "reject_proposal": {
            await db.setProposalReview({ proposalKey: operation.proposalKey, reviewStatus: "rejected", reason: input.reason });
            bump("proposals_rejected");
            break;
          }
          case "defer_proposal": {
            await db.setProposalReview({ proposalKey: operation.proposalKey, reviewStatus: "in_review", reason: input.reason });
            bump("proposals_deferred");
            break;
          }
          case "record_decision": {
            await db.recordDecision({ ...input, decisionKey });
            await db.markDecisionApplied(decisionKey, appliedBy);
            bump("decisions_recorded");
            break;
          }
          case "needs_rereview": {
            break;
          }
        }
      }
      report.executed += 1;
    } catch (error) {
      report.errors.push({ decisionKey, code: "execute_failed", detail: error instanceof Error ? error.message : String(error) });
    }
  }
  return report;
}

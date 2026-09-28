/** Phase 3 entity-promotion apply CLI.
 *
 * Default mode is DRY RUN: validates a reviewed decision file, loads the live
 * canonical snapshot, plans operations, and prints the plan + SQL. Nothing is
 * written unless --apply is passed explicitly.
 *
 * Usage:
 *   node --experimental-strip-types scripts/kg-entity-promotion-apply.ts \
 *     --decisions <decisions.json> [--snapshot <snapshot.json>] [--sql-out <file>]
 *   # live apply (requires Supabase env + explicit flag):
 *   node --experimental-strip-types scripts/kg-entity-promotion-apply.ts \
 *     --decisions <decisions.json> --apply --reviewer <email>
 *
 * Snapshot form (offline): { canonical: CanonicalPlanRef[], aliases: AliasPlanRef[],
 *   kgProposals: KgProposalPlanRef[], appliedDecisionKeys: string[], edges: EdgePlanRef[] }
 * Live mode builds the snapshot from Supabase instead.
 */
import fs from "node:fs";
import {
  planApply,
  renderApplySql,
  validateDecisions,
  type AliasPlanRef,
  type ApplyContext,
  type CanonicalPlanRef,
  type EdgePlanRef,
  type KgProposalPlanRef,
  type ReviewDecisionInput,
} from "../src/lib/education/entity-promotion/promotion-applier";
import { buildLiveContext, executePlan, type PromotionDb } from "../src/lib/education/entity-promotion/promotion-apply-executor";

const commonModulePromise = import(new URL("./kg-automation-common.ts", import.meta.url).href);

function liveDb(supabase: { from: (relation: string) => any }): PromotionDb {
  const must = (error: unknown, what: string): void => {
    if (error) throw new Error(`${what}: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
  };
  const fetchAll = async (what: string, build: () => any): Promise<any[]> => {
    const rows: any[] = [];
    const pageSize = 1_000;
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await build().range(from, from + pageSize - 1);
      must(error, what);
      const page = data ?? [];
      rows.push(...page);
      if (page.length < pageSize) return rows;
    }
  };
  return {
    fetchCanonical: async () => {
      const data = await fetchAll("fetchCanonical", () => supabase.from("canonical_entities")
        .select("id,normalized_label,entity_type").eq("is_active", true).order("id"));
      return data.map((row: any) => ({ id: row.id, normalizedLabel: row.normalized_label, entityType: row.entity_type }));
    },
    fetchAliases: async () => {
      const data = await fetchAll("fetchAliases", () => supabase.from("canonical_entity_aliases")
        .select("id,normalized_alias,canonical_entity_id,is_active").eq("is_active", true).order("id"));
      return data.map((row: any) => ({ normalizedAlias: row.normalized_alias, canonicalEntityId: row.canonical_entity_id, isActive: row.is_active }));
    },
    fetchKgProposals: async (ids) => {
      if (ids.length === 0) return [];
      const { data, error } = await supabase.from("kg_automation_proposals").select("id,review_status,proposal_type,superseded_by").in("id", ids);
      must(error, "fetchKgProposals");
      return (data ?? []).map((row: any) => ({ id: row.id, reviewStatus: row.review_status, proposalType: row.proposal_type, supersededBy: row.superseded_by }));
    },
    fetchAppliedDecisionKeys: async () => {
      const data = await fetchAll("fetchAppliedDecisionKeys", () => supabase.from("entity_review_decisions")
        .select("id,decision_key").not("applied_at", "is", null).order("id"));
      return data.map((row: any) => row.decision_key as string);
    },
    fetchProposalEdges: async (proposalIds) => {
      if (proposalIds.length === 0) return [];
      const { data, error } = await supabase.from("claim_entities").select("claim_id,role,entity_kind,canonical_entity_id,proposed_proposal_id").eq("is_active", true).in("proposed_proposal_id", proposalIds);
      must(error, "fetchProposalEdges");
      return (data ?? []).map((row: any) => ({ claimId: row.claim_id, role: row.role, entityKind: row.entity_kind, canonicalEntityId: row.canonical_entity_id, proposalId: row.proposed_proposal_id }));
    },
    insertCanonicalEntity: async (input) => {
      const existing = await supabase.from("canonical_entities").select("id").eq("normalized_label", input.normalizedLabel).limit(1);
      must(existing.error, "insertCanonicalEntity lookup");
      if ((existing.data ?? []).length > 0) return (existing.data as any[])[0].id as string;
      const { data, error } = await supabase.from("canonical_entities").insert({
        entity_type: input.entityType,
        preferred_label: input.label,
        normalized_label: input.normalizedLabel,
        slug: input.slug,
        status: "reviewed",
        review_status: "approved",
        metadata: { created_from_decision_key: input.decisionKey },
        comments: "Promoted from reviewed Phase 3 decision.",
        is_active: true,
      }).select("id").limit(1);
      must(error, "insertCanonicalEntity");
      return (data as any[])[0].id as string;
    },
    insertAlias: async (input) => {
      const existing = await supabase.from("canonical_entity_aliases").select("id")
        .eq("canonical_entity_id", input.canonicalEntityId).eq("normalized_alias", input.normalizedAlias).eq("is_active", true).limit(1);
      must(existing.error, "insertAlias lookup");
      if ((existing.data ?? []).length > 0) return;
      const { error } = await supabase.from("canonical_entity_aliases").insert({
        canonical_entity_id: input.canonicalEntityId,
        alias_name: input.aliasName,
        normalized_alias: input.normalizedAlias,
        alias_type: input.aliasType,
        review_status: "approved",
        reviewed_by: input.reviewer,
        reviewed_at: new Date().toISOString(),
        created_from_decision_key: input.decisionKey,
        comments: "Reviewed Phase 3 alias.",
        is_active: true,
      });
      must(error, "insertAlias");
    },
    repointEdges: async (input) => {
      const { data, error } = await supabase.from("claim_entities").select("id,claim_id,claim_version_id,role,confidence,evidence_locator,algorithm_version,metadata")
        .eq("is_active", true).eq("entity_kind", "proposed").eq("proposed_proposal_id", input.fromProposalKey);
      must(error, "repointEdges lookup");
      let count = 0;
      for (const row of (data ?? []) as any[]) {
        const insert = await supabase.from("claim_entities").insert({
          claim_id: row.claim_id,
          claim_version_id: row.claim_version_id,
          entity_kind: "canonical",
          canonical_entity_id: input.canonicalEntityId,
          role: row.role,
          confidence: row.confidence,
          evidence_locator: row.evidence_locator,
          algorithm_version: "promotion-applier.v1",
          metadata: { ...(row.metadata ?? {}), repointed_from_proposal_id: input.fromProposalKey, decision_key: input.decisionKey },
          is_active: true,
        });
        if (insert.error) throw new Error(`repointEdges insert: ${JSON.stringify(insert.error)}`);
        const deactivate = await supabase.from("claim_entities").update({
          is_active: false,
          metadata: { ...(row.metadata ?? {}), superseded_by_decision_key: input.decisionKey },
        }).eq("id", row.id);
        must(deactivate.error, "repointEdges deactivate");
        count += 1;
      }
      return count;
    },
    mergeProposal: async (input) => {
      const { error } = await supabase.from("kg_automation_proposals").update({
        superseded_by: input.headProposalKey, review_status: "superseded", reviewer_notes: input.reason, updated_at: new Date().toISOString(),
      }).eq("id", input.memberProposalKey).is("superseded_by", null);
      must(error, "mergeProposal");
    },
    setProposalReview: async (input) => {
      const { error } = await supabase.from("kg_automation_proposals").update({
        review_status: input.reviewStatus, reviewer_notes: input.reason, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }).eq("id", input.proposalKey);
      must(error, "setProposalReview");
    },
    recordDecision: async (input) => {
      const { error } = await supabase.from("entity_review_decisions").insert({
        decision_key: input.decisionKey,
        kg_proposal_id: input.kgProposalId ?? null,
        offline_proposal_id: input.offlineProposalId ?? null,
        proposal_label: input.proposalLabel,
        proposal_normalized_label: input.proposalNormalizedLabel,
        proposed_entity_type: input.proposedEntityType,
        decision: input.decision,
        canonical_entity_id: input.canonicalEntityId ?? null,
        merge_head_proposal_id: input.mergeHeadProposalId ?? null,
        canonical_label: input.canonicalLabel ?? null,
        entity_type: input.entityType ?? null,
        alias_type: input.aliasType ?? null,
        reviewer: input.reviewer,
        reason: input.reason,
        confidence: input.confidence ?? null,
        source_claim_ids: input.sourceClaimIds ?? [],
      });
      if (error && !/duplicate|unique/i.test(JSON.stringify(error))) throw new Error(`recordDecision: ${JSON.stringify(error)}`);
    },
    markDecisionApplied: async (decisionKey, appliedBy) => {
      const { error } = await supabase.from("entity_review_decisions").update({
        applied_at: new Date().toISOString(), applied_by: appliedBy,
      }).eq("decision_key", decisionKey);
      must(error, "markDecisionApplied");
    },
  };
}

type Args = {
  decisionsPath: string | null;
  snapshotPath: string | null;
  sqlOutPath: string | null;
  apply: boolean;
  live: boolean;
  reviewer: string | null;
  target: "staging" | "production" | null;
  confirmProjectRef: string | null;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {
    decisionsPath: null,
    snapshotPath: null,
    sqlOutPath: null,
    apply: false,
    live: false,
    reviewer: null,
    target: null,
    confirmProjectRef: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === "--apply") args.apply = true;
    else if (token === "--live") args.live = true;
    else if (token === "--decisions") args.decisionsPath = argv[++i] ?? null;
    else if (token === "--snapshot") args.snapshotPath = argv[++i] ?? null;
    else if (token === "--sql-out") args.sqlOutPath = argv[++i] ?? null;
    else if (token === "--reviewer") args.reviewer = argv[++i] ?? null;
    else if (token === "--target") {
      const target = argv[++i] ?? null;
      if (target !== "staging" && target !== "production") throw new Error("--target must be staging or production");
      args.target = target;
    } else if (token === "--confirm-project-ref") args.confirmProjectRef = argv[++i] ?? null;
  }
  return args;
}

function loadSnapshot(path: string): ApplyContext {
  const raw = JSON.parse(fs.readFileSync(path, "utf8")) as {
    canonical: CanonicalPlanRef[];
    aliases: AliasPlanRef[];
    kgProposals: KgProposalPlanRef[];
    appliedDecisionKeys: string[];
    edges: EdgePlanRef[];
  };
  const canonicalById = new Map(raw.canonical.map((entry) => [entry.id, entry]));
  const canonicalByNormalized = new Map<string, CanonicalPlanRef[]>();
  for (const entry of raw.canonical) {
    const list = canonicalByNormalized.get(entry.normalizedLabel) ?? [];
    list.push(entry);
    canonicalByNormalized.set(entry.normalizedLabel, list);
  }
  return {
    canonicalById,
    canonicalByNormalized,
    aliases: raw.aliases ?? [],
    kgProposals: new Map((raw.kgProposals ?? []).map((entry) => [entry.id, entry])),
    appliedDecisionKeys: new Set(raw.appliedDecisionKeys ?? []),
    edges: raw.edges ?? [],
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!args.decisionsPath) {
    console.error("missing --decisions <file>");
    process.exit(2);
  }
  const decisions = JSON.parse(fs.readFileSync(args.decisionsPath, "utf8")) as ReviewDecisionInput[];
  const validation = validateDecisions(decisions);
  if (validation.length > 0) {
    console.error(`decision file invalid: ${validation.length} error(s)`);
    for (const entry of validation.slice(0, 20)) {
      console.error(`  [${entry.index}] ${entry.code}: ${entry.detail}`);
    }
    process.exit(2);
  }
  if (args.apply) {
    const { createServiceRoleClient, requireStagingEnvironment, resolveEnv } = await commonModulePromise;
    if (args.target === "production") {
      const { supabaseUrl } = resolveEnv();
      const actualRef = new URL(supabaseUrl).hostname.split(".")[0] ?? "";
      if (!args.confirmProjectRef || args.confirmProjectRef !== actualRef) {
        throw new Error(`Production apply requires --confirm-project-ref matching ${actualRef || "the configured project"}.`);
      }
    } else {
      requireStagingEnvironment();
    }
    if (!args.reviewer) {
      console.error("apply mode requires --reviewer <email> for the applied_by record.");
      process.exit(2);
    }
    const report = await executePlan(liveDb(createServiceRoleClient()), decisions, args.reviewer);
    console.log(JSON.stringify(report, null, 2));
    process.exit(report.errors.length > 0 ? 1 : 0);
  }
  let context: ApplyContext;
  if (args.live) {
    const { createServiceRoleClient } = await commonModulePromise;
    context = await buildLiveContext(liveDb(createServiceRoleClient()), decisions);
  } else if (args.snapshotPath) {
    context = loadSnapshot(args.snapshotPath);
  } else {
    console.error("dry-run needs --live or --snapshot <file>.");
    process.exit(2);
  }
  const plan = planApply(decisions, context, true);
  const sql = renderApplySql(plan, decisions);
  if (args.sqlOutPath) fs.writeFileSync(args.sqlOutPath, sql);
  else console.log(sql);
  console.log(JSON.stringify({ stats: plan.stats, operations: plan.operations.length, errors: plan.errors.length, warnings: plan.warnings.length }));
  if (plan.errors.length > 0) {
    for (const entry of plan.errors.slice(0, 20)) {
      console.error(`  ERROR ${entry.decisionKey}: ${entry.code} ${entry.detail}`);
    }
    process.exit(1);
  }
}

await main();

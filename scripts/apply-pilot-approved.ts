/**
 * Apply staging-approved pilot proposals to canonical tables.
 * Topic-agnostic slug-resolving apply with staging guard.
 *
 * Usage:
 *   KG_TARGET_ENV=staging npm run kg:pilot:apply-approved -- --topic ankle-fracture
 *   KG_TARGET_ENV=staging npm run kg:pilot:apply-approved -- --topic compartment-syndrome --dry-run
 *
 * Decision points remain gated unless explicit staging draft simulation:
 *   KG_STAGING_REVIEW_MODE=1 ... --include-staging-drafts
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import type { ProposalRecord } from "./kg-automation-common.ts";
import {
  createServiceRoleClient,
  normalizeLabel,
  slugify,
} from "./kg-automation-common.ts";
import { resolveTopic } from "./lib/education/kg-compiler/topic-registry.ts";
import { validateRelationshipTriple } from "./lib/education/kg-relationship-registry.ts";
import { requireStaging } from "./lib/education/kg-staging-guard.ts";

type ApplyReport = {
  topicKey: string;
  pilotKey: string;
  dryRun: boolean;
  stagingReviewMode: boolean;
  guard: ReturnType<typeof requireStaging>;
  approvedLoaded: number;
  applied: Record<string, number>;
  skipped: Array<{ fingerprint: string; reason: string }>;
  errors: string[];
  draftLeakChecks: {
    claimsInsertedAsDraft: number;
    claimsInsertedAsVerified: number;
    dpsInsertedAsDraft: number;
    dpsInsertedAsVerified: number;
  };
};

function parseArgs(argv: string[]) {
  let topic = "";
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--topic") {
      topic = argv[i + 1] ?? "";
      i += 1;
    }
  }
  return {
    topic,
    dryRun: argv.includes("--dry-run"),
    includeStagingDrafts: argv.includes("--include-staging-drafts"),
  };
}

const STAGING_REVIEWER = "staging_test_reviewer_not_clinical";
const APPLY_SCRIPT = "apply-pilot-approved";

async function loadApprovedPilotProposals(
  supabase: ReturnType<typeof createServiceRoleClient>,
  pilotKey: string
): Promise<ProposalRecord[]> {
  const { data, error } = await supabase
    .from("kg_automation_proposals")
    .select("*")
    .contains("metadata", { pilot: pilotKey })
    .eq("is_active", true)
    .eq("review_status", "approved");

  if (error) throw error;
  return (data ?? []) as ProposalRecord[];
}

async function resolveSlugMap(
  supabase: ReturnType<typeof createServiceRoleClient>,
  pilotKey: string,
  requiredSlugs: string[] = []
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const { data, error } = await supabase
    .from("canonical_entities")
    .select("id,slug,metadata,preferred_label")
    .contains("metadata", { pilot: pilotKey })
    .eq("is_active", true);

  if (error) throw error;

  for (const row of data ?? []) {
    const fromMeta = String(row.metadata?.slug ?? "");
    const slug = row.slug ?? (fromMeta || slugify(String(row.preferred_label ?? "")));
    if (slug) map.set(slug, row.id);
  }

  const missing = requiredSlugs.filter((slug) => slug && !map.has(slug));
  if (missing.length > 0) {
    const { data: globalRows, error: globalError } = await supabase
      .from("canonical_entities")
      .select("id,slug")
      .in("slug", missing)
      .eq("is_active", true);
    if (globalError) throw globalError;
    for (const row of globalRows ?? []) {
      if (row.slug) map.set(row.slug, row.id);
    }
  }

  return map;
}

async function main() {
  const args = parseArgs(process.argv);
  const topicDef = resolveTopic(args.topic);
  if (!topicDef) {
    console.error(`Unknown topic: ${args.topic}`);
    process.exitCode = 1;
    return;
  }

  const pilotKey = topicDef.pilotKey;
  const curriculumNodeSlug = topicDef.sources.curriculumNodeSlug;
  const guard = requireStaging(`${topicDef.topicKey} pilot apply-approved`);
  const stagingReviewMode = process.env.KG_STAGING_REVIEW_MODE === "1";

  const supabase = createServiceRoleClient();
  const proposals = await loadApprovedPilotProposals(supabase, pilotKey);

  const report: ApplyReport = {
    topicKey: topicDef.topicKey,
    pilotKey,
    dryRun: args.dryRun,
    stagingReviewMode,
    guard,
    approvedLoaded: proposals.length,
    applied: {
      entities: 0,
      relationships: 0,
      bridges: 0,
      claims_draft: 0,
      decision_points_draft: 0,
      proposals_marked_applied: 0,
    },
    skipped: [],
    errors: [],
    draftLeakChecks: {
      claimsInsertedAsDraft: 0,
      claimsInsertedAsVerified: 0,
      dpsInsertedAsDraft: 0,
      dpsInsertedAsVerified: 0,
    },
  };

  const entityProposals = proposals.filter((p) => p.proposal_type === "create_canonical_entity");
  const relationshipProposals = proposals.filter((p) => p.proposal_type === "add_canonical_relationship");
  const bridgeProposals = proposals.filter((p) => p.proposal_type === "link_curriculum_node_to_entity");
  const claimProposals = proposals.filter((p) => p.proposal_type === "propose_educational_claim");
  const dpProposals = proposals.filter((p) => p.proposal_type === "propose_decision_point");

  for (const proposal of entityProposals) {
    const slug = String(proposal.metadata?.slug ?? slugify(String(proposal.proposed_entity_label ?? "")));
    const { data: existing } = await supabase.from("canonical_entities").select("id").eq("slug", slug).limit(1);

    if ((existing ?? []).length > 0) {
      report.skipped.push({ fingerprint: proposal.proposal_fingerprint, reason: `entity exists: ${slug}` });
      continue;
    }

    if (!args.dryRun) {
      const { error } = await supabase.from("canonical_entities").insert({
        entity_type: proposal.proposed_entity_type,
        preferred_label: proposal.proposed_entity_label,
        normalized_label: normalizeLabel(String(proposal.proposed_entity_label ?? "")),
        slug,
        status: "reviewed",
        review_status: "approved",
        metadata: {
          ...proposal.metadata,
          pilot: pilotKey,
          staging_apply: true,
          staging_reviewer: STAGING_REVIEWER,
          created_from_proposal_fingerprint: proposal.proposal_fingerprint,
          clinical_verification: false,
        },
        comments: "Staging apply — auto-approved low-risk entity (not clinical verification).",
        is_active: true,
      });
      if (error) {
        report.errors.push(`${proposal.proposal_fingerprint}: ${error.message}`);
        continue;
      }
    }
    report.applied.entities += 1;
  }

  const requiredSlugs = [
    ...entityProposals.map((p) => String(p.metadata?.slug ?? slugify(String(p.proposed_entity_label ?? "")))),
    ...relationshipProposals.flatMap((p) => [
      String(p.metadata?.subject_slug ?? ""),
      String(p.metadata?.object_slug ?? ""),
    ]),
    ...claimProposals.map((p) => String(p.metadata?.primary_entity_slug ?? "")),
    ...bridgeProposals.map((p) => String(p.metadata?.primary_entity_slug ?? topicDef.primaryEntitySlug)),
    ...dpProposals.map((p) => String(p.metadata?.subject_entity_slug ?? "")),
  ].filter(Boolean);

  let slugToId = await resolveSlugMap(supabase, pilotKey, requiredSlugs);

  if (args.dryRun) {
    for (const proposal of entityProposals) {
      const slug = String(proposal.metadata?.slug ?? slugify(String(proposal.proposed_entity_label ?? "")));
      if (slug && !slugToId.has(slug)) slugToId.set(slug, `dry-run:${slug}`);
    }
  }

  for (const proposal of relationshipProposals) {
    const subjectSlug = String(proposal.metadata?.subject_slug ?? "");
    const objectSlug = String(proposal.metadata?.object_slug ?? "");
    const predicate = String(proposal.proposed_predicate ?? "");
    const subjectId = slugToId.get(subjectSlug);
    const objectId = slugToId.get(objectSlug);

    if (!subjectId || !objectId) {
      report.skipped.push({
        fingerprint: proposal.proposal_fingerprint,
        reason: `missing slug resolution ${subjectSlug} -> ${objectSlug}`,
      });
      continue;
    }

    const validation = validateRelationshipTriple({
      subjectEndpointType: "canonical_entity",
      subjectEntityType: String(proposal.metadata?.subject_entity_type ?? ""),
      predicate,
      objectEndpointType: "canonical_entity",
      objectEntityType: String(proposal.metadata?.object_entity_type ?? ""),
    });
    if (!validation.valid) {
      report.skipped.push({ fingerprint: proposal.proposal_fingerprint, reason: validation.errors.join("; ") });
      continue;
    }

    const { data: existing } = await supabase
      .from("canonical_relationships")
      .select("id")
      .eq("subject_entity_id", subjectId)
      .eq("object_entity_id", objectId)
      .eq("predicate", predicate)
      .eq("is_active", true)
      .limit(1);

    if ((existing ?? []).length > 0) {
      report.skipped.push({ fingerprint: proposal.proposal_fingerprint, reason: "relationship exists" });
      continue;
    }

    if (!args.dryRun) {
      const { error } = await supabase.from("canonical_relationships").insert({
        subject_entity_type: "canonical_entity",
        subject_entity_id: subjectId,
        predicate,
        object_entity_type: "canonical_entity",
        object_entity_id: objectId,
        confidence: proposal.confidence,
        review_status: "approved",
        provenance_status: "reviewed",
        lifecycle_status: "active",
        created_by_source: "reviewed",
        metadata: {
          relationship_metadata: proposal.metadata?.relationship_metadata ?? {},
          staging_apply: true,
          staging_reviewer: STAGING_REVIEWER,
          clinical_verification: false,
          created_from_proposal_fingerprint: proposal.proposal_fingerprint,
        },
        comments: "Staging apply — auto-approved relationship.",
        is_active: true,
      });
      if (error) {
        report.errors.push(`${proposal.proposal_fingerprint}: ${error.message}`);
        continue;
      }
    }
    report.applied.relationships += 1;
  }

  for (const proposal of bridgeProposals) {
    const primarySlug = String(proposal.metadata?.primary_entity_slug ?? topicDef.primaryEntitySlug);
    const entityId = slugToId.get(primarySlug);
    if (!entityId) {
      report.skipped.push({ fingerprint: proposal.proposal_fingerprint, reason: "bridge entity missing" });
      continue;
    }

    const { data: nodeRows } = await supabase
      .from("curriculum_nodes")
      .select("id")
      .eq("slug", curriculumNodeSlug)
      .limit(1);

    const nodeId = nodeRows?.[0]?.id;
    if (!nodeId) {
      report.skipped.push({ fingerprint: proposal.proposal_fingerprint, reason: "curriculum node not found" });
      continue;
    }

    const { data: existing } = await supabase
      .from("curriculum_node_entities")
      .select("id")
      .eq("curriculum_node_id", nodeId)
      .eq("canonical_entity_id", entityId)
      .eq("is_active", true)
      .limit(1);

    if ((existing ?? []).length > 0) {
      report.skipped.push({ fingerprint: proposal.proposal_fingerprint, reason: "bridge exists" });
      continue;
    }

    if (!args.dryRun) {
      const { error } = await supabase.from("curriculum_node_entities").insert({
        curriculum_node_id: nodeId,
        canonical_entity_id: entityId,
        relation_type: proposal.proposed_bridge_type ?? "primary_coverage",
        confidence: proposal.confidence,
        review_status: "approved",
        provenance_status: "reviewed",
        metadata: {
          staging_apply: true,
          staging_reviewer: STAGING_REVIEWER,
          clinical_verification: false,
        },
        comments: "Staging bridge apply.",
        is_active: true,
      });
      if (error) {
        report.errors.push(`${proposal.proposal_fingerprint}: ${error.message}`);
        continue;
      }
    }
    report.applied.bridges += 1;
  }

  for (const proposal of claimProposals) {
    const primarySlug = String(proposal.metadata?.primary_entity_slug ?? "");
    const entityId = slugToId.get(primarySlug);
    if (!entityId) {
      report.skipped.push({ fingerprint: proposal.proposal_fingerprint, reason: "claim entity missing" });
      continue;
    }

    if (!args.dryRun) {
      const { error } = await supabase.from("educational_claims").insert({
        primary_entity_id: entityId,
        claim_text: String(proposal.metadata?.claim_text ?? ""),
        claim_type: String(proposal.metadata?.claim_type ?? "fact"),
        importance_level: String(proposal.metadata?.importance_level ?? "L2"),
        content_source: "generated_draft",
        review_status: "unreviewed",
        metadata: {
          draft_id: proposal.metadata?.draft_id,
          staging_apply: true,
          staging_reviewer: STAGING_REVIEWER,
          clinical_verification: false,
          curation_route: proposal.metadata?.curation_route,
        },
        is_active: true,
      });
      if (error) {
        report.errors.push(`${proposal.proposal_fingerprint}: ${error.message}`);
        continue;
      }
    }
    report.applied.claims_draft += 1;
    report.draftLeakChecks.claimsInsertedAsDraft += 1;
  }

  if (args.includeStagingDrafts && stagingReviewMode) {
    for (const proposal of dpProposals) {
      const subjectSlug = String(proposal.metadata?.subject_entity_slug ?? "");
      const entityId = slugToId.get(subjectSlug);
      if (!entityId) {
        report.skipped.push({ fingerprint: proposal.proposal_fingerprint, reason: "dp entity missing" });
        continue;
      }

      if (!args.dryRun) {
        const { error } = await supabase.from("decision_points").insert({
          subject_entity_id: entityId,
          pattern_type: String(proposal.metadata?.pattern_type ?? ""),
          trigger_text: String(proposal.metadata?.trigger ?? ""),
          action_text: String(proposal.metadata?.action ?? ""),
          urgency: String(proposal.metadata?.urgency ?? "routine"),
          safety_criticality: String(proposal.metadata?.safety_criticality ?? "none"),
          content_source: "generated_draft",
          review_status: "unreviewed",
          metadata: {
            draft_id: proposal.metadata?.draft_id,
            staging_apply: true,
            staging_reviewer: STAGING_REVIEWER,
            clinical_verification: false,
            requires_attending_review: proposal.metadata?.requires_attending_review,
            staging_review_mode: true,
          },
          is_active: true,
        });
        if (error) {
          report.errors.push(`${proposal.proposal_fingerprint}: ${error.message}`);
          continue;
        }
      }
      report.applied.decision_points_draft += 1;
      report.draftLeakChecks.dpsInsertedAsDraft += 1;
    }
  } else {
    for (const proposal of dpProposals) {
      report.skipped.push({
        fingerprint: proposal.proposal_fingerprint,
        reason: "decision point gated — requires KG_STAGING_REVIEW_MODE=1 and --include-staging-drafts",
      });
    }
  }

  if (!args.dryRun) {
    for (const proposal of proposals) {
      const handled =
        proposal.proposal_type === "create_canonical_entity" ||
        proposal.proposal_type === "add_canonical_relationship" ||
        proposal.proposal_type === "link_curriculum_node_to_entity" ||
        proposal.proposal_type === "propose_educational_claim" ||
        (args.includeStagingDrafts &&
          stagingReviewMode &&
          proposal.proposal_type === "propose_decision_point");

      if (!handled) continue;

      const { error } = await supabase
        .from("kg_automation_proposals")
        .update({
          review_status: "applied",
          applied_at: new Date().toISOString(),
          metadata: {
            ...proposal.metadata,
            applied_by_script: APPLY_SCRIPT,
            staging_apply: true,
            staging_reviewer: STAGING_REVIEWER,
            clinical_verification: false,
          },
        })
        .eq("proposal_fingerprint", proposal.proposal_fingerprint)
        .eq("is_active", true);

      if (!error) report.applied.proposals_marked_applied += 1;
    }
  }

  const outDir = path.join(process.cwd(), "reports", "kg-pilots");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    path.join(outDir, `${topicDef.topicKey}-staging-apply-result.json`),
    `${JSON.stringify(report, null, 2)}\n`
  );

  console.log(JSON.stringify(report, null, 2));
  if (report.errors.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});